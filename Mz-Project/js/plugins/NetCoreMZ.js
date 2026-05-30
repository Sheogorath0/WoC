/*:
 * @target MZ
 * @plugindesc MZ 20인 MMO - [9단계] 독립 렌더러 기반 실시간 이름표(Name Tag) 구현
 * @author 코딩 파트너
 */

(() => {
    const SERVER_URL = "ws://localhost:8080";
    let socket = null;
    let myNetId = null;
    let isLoggedIn = false;
    let titleSceneRef = null;

    const remotePlayers = {};

    // ===================================================================
    // 1. 순수 네트워크 캐릭터 클래스
    // ===================================================================
    function Game_NetPlayer() {
        this.initialize(...arguments);
    }

    Game_NetPlayer.prototype = Object.create(Game_Character.prototype);
    Game_NetPlayer.prototype.constructor = Game_NetPlayer;

    Game_NetPlayer.prototype.initialize = function (userId, data) {
        Game_Character.prototype.initialize.call(this);
        this._userId = userId; // 유저 ID 저장 (이름표에 사용)
        this.setPosition(data.x, data.y);
        this.setImage(data.characterName, data.characterIndex);
        this.setDirection(data.d || 2);
        this.setMoveSpeed(data.moveSpeed || 4);
        this.setThrough(true);
        this.setStepAnime(true);
        this._sprite = null;
    };

    Game_NetPlayer.prototype.updateData = function (data) {
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

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        for (const id in remotePlayers) {
            if (remotePlayers[id]) remotePlayers[id].update();
        }
    };

    // ===================================================================
    // 2. [신규 추가] 이름표를 그리는 전용 텍스트 스프라이트 클래스
    // ===================================================================
    function Sprite_NetNameTag() {
        this.initialize(...arguments);
    }
    Sprite_NetNameTag.prototype = Object.create(Sprite.prototype);
    Sprite_NetNameTag.prototype.constructor = Sprite_NetNameTag;

    Sprite_NetNameTag.prototype.initialize = function (userId) {
        Sprite.prototype.initialize.call(this);
        this._userId = userId;
        this.bitmap = new Bitmap(120, 30); // 이름표가 그려질 투명 도화지 생성
        this.bitmap.fontFace = $gameSystem.mainFontFace();
        this.bitmap.fontSize = 14;          // 깔끔한 폰트 크기
        this.bitmap.textColor = "#ffffff";  // 흰색 글씨
        this.bitmap.outlineColor = "#000000"; // 검은색 테두리 (가독성 확보)
        this.bitmap.outlineWidth = 4;

        // 도화지 중앙에 유저 ID 정렬하여 그리기
        this.bitmap.drawText(this._userId, 0, 0, 120, 30, "center");

        // 캐릭터 스프라이트 기준으로 정중앙 상단에 위치하도록 정렬 축(Anchor) 세팅
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
    };

    // ===================================================================
    // 3. 타이틀 화면 하이재킹 (로그인 처리)
    // ===================================================================
    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function () {
        _Scene_Title_start.call(this);
        isLoggedIn = false;
        titleSceneRef = null;
        for (const key in remotePlayers) delete remotePlayers[key];
    };

    const _Scene_Title_commandNewGame = Scene_Title.prototype.commandNewGame;
    Scene_Title.prototype.commandNewGame = function () {
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
            socket.onopen = () => {
                socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
            };
            socket.onmessage = (event) => handleServerPacket(JSON.parse(event.data));
        } else {
            socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
        }
    }

    function handleServerPacket(packet) {
        switch (packet.type) {
            case 'LOGIN_SUCCESS':
                isLoggedIn = true;
                myNetId = packet.id;
                console.log(`[Network] ${myNetId} 로그인 성공!`);

                DataManager.setupNewGame();
                $gamePlayer.setImage(packet.characterName, packet.characterIndex);
                $gamePlayer.reserveTransfer(1, packet.x, packet.y, 2, 0);

                if (packet.existingPlayers) {
                    for (const id in packet.existingPlayers) {
                        if (id !== myNetId) remotePlayers[id] = new Game_NetPlayer(id, packet.existingPlayers[id]);
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
                updateRemotePlayer(packet.id, packet);
                break;

            case 'REMOVE_PLAYER':
                removeRemotePlayer(packet.id);
                break;
        }
    }

    // ===================================================================
    // 4. 엔진 로딩과 분리된 독립 렌더링 + 이름표 주입
    // ===================================================================
    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function () {
        _Spriteset_Map_createCharacters.call(this);
        for (const id in remotePlayers) addNetSpriteToScene(this, remotePlayers[id]);
    };

    function addNetSpriteToScene(spriteset, netPlayer) {
        if (!spriteset || !spriteset._tilemap) return;

        // 1. 캐릭터 스프라이트 생성 및 맵 주입
        const sprite = new Sprite_Character(netPlayer);
        spriteset._characterSprites.push(sprite);
        spriteset._tilemap.addChild(sprite);
        netPlayer._sprite = sprite;

        // 2. [신규] 생성된 캐릭터 스프라이트 머리 위에 이름표 스프라이트 장착
        const nameTag = new Sprite_NetNameTag(netPlayer._userId);
        // 캐릭터 머리 위 여백 조절 (MZ 픽셀 규격 기준: -48 오프셋)
        nameTag.y = -48;
        sprite.addChild(nameTag);
    }

    function updateRemotePlayer(userId, data) {
        if (userId === myNetId) return;

        if (!remotePlayers[userId]) {
            remotePlayers[userId] = new Game_NetPlayer(userId, data);
            if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
                addNetSpriteToScene(SceneManager._scene._spriteset, remotePlayers[userId]);
            }
        } else {
            remotePlayers[userId].updateData(data);
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
    // 5. 내 움직임 서버로 전송
    // ===================================================================
    const _Game_Player_executeMove = Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove = function (direction) {
        _Game_Player_executeMove.call(this, direction);
        if (isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'MOVE',
                x: this.x, y: this.y, d: this.direction(),
                characterName: $gamePlayer.characterName(), characterIndex: $gamePlayer.characterIndex(),
                moveSpeed: this.realMoveSpeed()
            }));
        }
    };

    // ===================================================================
    // 6. 창 비활성화(백그라운드) 무한 실행
    // ===================================================================
    WebAudio._onHide = function () { };
    SceneManager.isGameActive = function () { return true; };

})();