/*:
 * @target MZ
 * @plugindesc MZ 20인 MMO - [10단계] 독립 렌더러 기반 멀티 맵 세션 분리 완벽판
 * @author 코딩 파트너
 */

(() => {
    const SERVER_URL = "ws://localhost:8080";
    let socket = null;
    let myNetId = null;
    let isLoggedIn = false;
    let titleSceneRef = null;
    
    // 현재 맵에 존재하는 원격 플레이어들만 실시간 관리하는 저장소
    let remotePlayers = {}; 

    // ===================================================================
    // 1. 순수 네트워크 캐릭터 클래스 및 이름표
    // ===================================================================
    function Game_NetPlayer() {
        this.initialize(...arguments);
    }
    Game_NetPlayer.prototype = Object.create(Game_Character.prototype);
    Game_NetPlayer.prototype.constructor = Game_NetPlayer;
    
    Game_NetPlayer.prototype.initialize = function(userId, data) {
        Game_Character.prototype.initialize.call(this);
        this._userId = userId;
        this.setPosition(data.x, data.y);
        this.setImage(data.characterName, data.characterIndex);
        this.setDirection(data.d || 2);
        this.setMoveSpeed(data.moveSpeed || 4); 
        this.setThrough(true);
        this.setStepAnime(true);
        this._sprite = null;     
    };

    Game_NetPlayer.prototype.updateData = function(data) {
        this.setDirection(data.d);
        if (data.moveSpeed !== undefined) this.setMoveSpeed(data.moveSpeed);

        const diffX = Math.abs(this._x - data.x);
        const diffY = Math.abs(this._y - data.y);
        
        if (diffX > 1 || diffY > 1) {
            this.setPosition(data.x, data.y);
        } else {
            this._x = data.x;
            this._y = data.y;
        }
        this.setImage(data.characterName, data.characterIndex);
    };

    function Sprite_NetNameTag() {
        this.initialize(...arguments);
    }
    Sprite_NetNameTag.prototype = Object.create(Sprite.prototype);
    Sprite_NetNameTag.prototype.constructor = Sprite_NetNameTag;

    Sprite_NetNameTag.prototype.initialize = function(userId) {
        Sprite.prototype.initialize.call(this);
        this._userId = userId;
        this.bitmap = new Bitmap(120, 30);
        this.bitmap.fontFace = $gameSystem.mainFontFace();
        this.bitmap.fontSize = 14;
        this.bitmap.textColor = "#ffffff";
        this.bitmap.outlineColor = "#000000";
        this.bitmap.outlineWidth = 4;
        this.bitmap.drawText(this._userId, 0, 0, 120, 30, "center");
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        for (const id in remotePlayers) {
            if (remotePlayers[id]) remotePlayers[id].update(); 
        }
    };

    // ===================================================================
    // 2. 타이틀 하이재킹 및 데이터 정리
    // ===================================================================
    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        isLoggedIn = false;
        titleSceneRef = null;
        clearAllRemotePlayers();
    };

    const _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function() {
        titleSceneRef = this;
        this._commandWindow.close(); 
        setTimeout(() => promptLogin(), 100);
    };

    function promptLogin() {
        const userId = prompt("로그인할 ID를 입력하세요 (예: admin, player1):");
        const userPassword = prompt("비밀번호를 입력하세요:");
        if (userId && userPassword) connectAndLogin(userId, userPassword);
        else if (titleSceneRef) {
            titleSceneRef._commandWindow.activate();
            titleSceneRef._commandWindow.open();
        }
    }

    function connectAndLogin(userId, password) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            socket = new WebSocket(SERVER_URL);
            socket.onopen = () => socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
            socket.onmessage = (event) => handleServerPacket(JSON.parse(event.data));
        } else {
            socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
        }
    }

    // [중요 로직] 다른 유저들을 화면과 메모리에서 흔적 없이 지우는 클린 함수
    function clearAllRemotePlayers() {
        for (const id in remotePlayers) {
            const netPlayer = remotePlayers[id];
            if (netPlayer && netPlayer._sprite && netPlayer._sprite.parent) {
                netPlayer._sprite.parent.removeChild(netPlayer._sprite);
            }
            delete remotePlayers[id];
        }
        remotePlayers = {};
    }

    function handleServerPacket(packet) {
        switch (packet.type) {
            case 'LOGIN_SUCCESS':
                isLoggedIn = true;
                myNetId = packet.id;
                console.log(`[Network] ${myNetId} 로그인 성공!`);
                
                DataManager.setupNewGame(); 
                $gamePlayer.setImage(packet.characterName, packet.characterIndex);
                
                // 파일에 저장되어 있던 mapId와 좌표로 이동 보존
                $gamePlayer.reserveTransfer(packet.mapId || 1, packet.x, packet.y, 2, 0);
                
                // 로그인 시 전체 명단을 받되, "나와 같은 맵에 있는 유저들만" 객체화하여 필터링 축적
                if (packet.existingPlayers) {
                    for (const id in packet.existingPlayers) {
                        if (id !== myNetId && packet.existingPlayers[id].mapId === (packet.mapId || 1)) {
                            remotePlayers[id] = new Game_NetPlayer(id, packet.existingPlayers[id]);
                        }
                    }
                }
                
                if (titleSceneRef) {
                    titleSceneRef.fadeOutAll();
                    SceneManager.goto(Scene_Map);
                }
                break;

            case 'LOGIN_FAIL':
                alert(packet.message);
                if (titleSceneRef) {
                    titleSceneRef._commandWindow.activate();
                    titleSceneRef._commandWindow.open();
                }
                break;

            case 'NEW_PLAYER':
            case 'UPDATE_POSITION':
                // 내 화면의 현재 맵 ID와 패킷 유저의 맵 ID가 일치할 때만 처리
                if (isLoggedIn && $gameMap && packet.mapId === $gameMap.mapId()) {
                    updateRemotePlayer(packet.id, packet);
                } else {
                    // 만약 내 맵과 다른 곳으로 가버린 유저라면 내 화면에서 지워줍니다.
                    removeRemotePlayer(packet.id);
                }
                break;

            case 'REMOVE_PLAYER':
                removeRemotePlayer(packet.id);
                break;
        }
    }

    // ===================================================================
    // 3. 독립 렌더링 및 맵 전환 리프레시
    // ===================================================================
    
    // [핵심] 유저가 포탈을 타고 새로운 맵 화면으로 들어왔을 때 실행되는 함수 하이재킹
    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        // 1. 맵이 바뀌었으므로 이전 맵의 유저 그림들을 완전히 청소합니다.
        clearAllRemotePlayers();
        
        _Spriteset_Map_createCharacters.call(this);
        
        // 2. 새로운 맵의 타일셋이 깔리면, 서버에 현재 내 바뀐 맵 위치 패킷을 1회 즉시 강제 전송합니다.
        // 이를 통해 서버가 내 맵 세션을 업데이트하고 주변 유저 목록을 동기화하게 유도합니다.
        if (isLoggedIn) {
            sendMovementPacket();
        }
    };

    function addNetSpriteToScene(spriteset, netPlayer) {
        if (!spriteset || !spriteset._tilemap || netPlayer._sprite) return;
        const sprite = new Sprite_Character(netPlayer);
        spriteset._characterSprites.push(sprite);
        spriteset._tilemap.addChild(sprite);
        netPlayer._sprite = sprite; 

        const nameTag = new Sprite_NetNameTag(netPlayer._userId);
        nameTag.y = -48; 
        sprite.addChild(nameTag);
    }

    function updateRemotePlayer(userId, data) {
        if (userId === myNetId) return; 

        if (!remotePlayers[userId]) {
            remotePlayers[userId] = new Game_NetPlayer(userId, data);
        } else {
            remotePlayers[userId].updateData(data);
        }

        // 화면 씬 구조가 매칭되면 렌더링 주입
        if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
            addNetSpriteToScene(SceneManager._scene._spriteset, remotePlayers[userId]);
        }
    }

    function removeRemotePlayer(userId) {
        const netPlayer = remotePlayers[userId];
        if (netPlayer) {
            if (netPlayer._sprite && netPlayer._sprite.parent) netPlayer._sprite.parent.removeChild(netPlayer._sprite);
            delete remotePlayers[userId];
        }
    }

    // ===================================================================
    // 4. 내 움직임 및 맵 ID 서버 전송
    // ===================================================================
    const _Game_Player_executeMove = Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove = function(direction) {
        _Game_Player_executeMove.call(this, direction);
        if (isLoggedIn) {
            sendMovementPacket();
        }
    };

    // [기능 확장] 맵 ID(`mapId()`)를 포함하여 서버에 위치를 송신하는 고정 함수
    function sendMovementPacket() {
        if (socket && socket.readyState === WebSocket.OPEN && $gameMap) {
            socket.send(JSON.stringify({
                type: 'MOVE',
                mapId: $gameMap.mapId(), // 현재 내 맵 번호 주입! (예: 1번 맵, 2번 맵)
                x: $gamePlayer.x, 
                y: $gamePlayer.y, 
                d: $gamePlayer.direction(),
                characterName: $gamePlayer.characterName(), 
                characterIndex: $gamePlayer.characterIndex(),
                moveSpeed: $gamePlayer.realMoveSpeed() 
            }));
        }
    }

    // 5. 백그라운드 구동 유지
    WebAudio._onHide = function() {};
    SceneManager.isGameActive = function() { return true; };

})();