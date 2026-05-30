/*:
 * @target MZ
 * @plugindesc MZ 20인 MMO - [13단계] 새 맵 진입 시 정지 유저 스폰 누락 버그 완벽 해결판
 * @author 코딩 파트너
 */

(() => {
    const SERVER_URL = "ws://localhost:8080";
    let socket = null;
    let myNetId = null;
    let isLoggedIn = false;
    let titleSceneRef = null;

    let remotePlayers = {};

    // ===================================================================
    // 1. 순수 네트워크 캐릭터 클래스 및 이름표
    // ===================================================================
    function Game_NetPlayer() { this.initialize(...arguments); }
    Game_NetPlayer.prototype = Object.create(Game_Character.prototype);
    Game_NetPlayer.prototype.constructor = Game_NetPlayer;
    Game_NetPlayer.prototype.initialize = function (userId, data) {
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
    Game_NetPlayer.prototype.updateData = function (data) {
        this.setDirection(data.d);
        if (data.moveSpeed !== undefined) this.setMoveSpeed(data.moveSpeed);
        const diffX = Math.abs(this._x - data.x);
        const diffY = Math.abs(this._y - data.y);
        if (diffX > 1 || diffY > 1) this.setPosition(data.x, data.y);
        else { this._x = data.x; this._y = data.y; }
        this.setImage(data.characterName, data.characterIndex);
    };

    function Sprite_NetNameTag() { this.initialize(...arguments); }
    Sprite_NetNameTag.prototype = Object.create(Sprite.prototype);
    Sprite_NetNameTag.prototype.constructor = Sprite_NetNameTag;
    Sprite_NetNameTag.prototype.initialize = function (userId) {
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
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        for (const id in remotePlayers) { if (remotePlayers[id]) remotePlayers[id].update(); }
    };

    // ===================================================================
    // 2. 타이틀 하이재킹 및 네트워크 리시버
    // ===================================================================
    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function () {
        _Scene_Title_start.call(this);
        isLoggedIn = false;
        titleSceneRef = null;
        clearAllRemotePlayers();

        const urlParams = new URLSearchParams(window.location.search);
        const autoId = urlParams.get('autoid');
        const autoPw = urlParams.get('autopw');

        if (autoId && autoPw) {
            titleSceneRef = this;
            if (this._commandWindow) this._commandWindow.close();
            connectAndLogin(autoId, autoPw);
        }
    };

    function connectAndLogin(userId, password) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            socket = new WebSocket(SERVER_URL);
            socket.onopen = () => socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
            socket.onmessage = (event) => handleServerPacket(JSON.parse(event.data));
        } else {
            socket.send(JSON.stringify({ type: 'REQUEST_LOGIN', id: userId, password: password }));
        }
    }

    function clearAllRemotePlayers() {
        for (const id in remotePlayers) {
            const netPlayer = remotePlayers[id];
            if (netPlayer && netPlayer._sprite && netPlayer._sprite.parent) netPlayer._sprite.parent.removeChild(netPlayer._sprite);
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
                $gamePlayer.reserveTransfer(packet.mapId || 1, packet.x, packet.y, 2, 0);

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

            case 'REFRESH_MAP_PLAYERS':
                // [신규] 맵 이동 직후 서버가 보내준 "새 맵의 고인물 정지 유저 목록"을 일괄 생성
                if (packet.existingPlayers) {
                    for (const id in packet.existingPlayers) {
                        if (id !== myNetId && !remotePlayers[id]) {
                            remotePlayers[id] = new Game_NetPlayer(id, packet.existingPlayers[id]);
                        }
                    }
                    // 주입 후 화면 스프라이트 셋업 갱신
                    if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
                        const spriteset = SceneManager._scene._spriteset;
                        for (const id in remotePlayers) {
                            addNetSpriteToScene(spriteset, remotePlayers[id]);
                        }
                    }
                }
                break;

            case 'NEW_PLAYER':
            case 'UPDATE_POSITION':
                if (isLoggedIn && $gameMap && packet.mapId === $gameMap.mapId()) {
                    updateRemotePlayer(packet.id, packet);
                } else {
                    removeRemotePlayer(packet.id);
                }
                break;

            case 'REMOVE_PLAYER':
                removeRemotePlayer(packet.id);
                break;
        }
    }

    // ===================================================================
    // 3. 독립 렌더링 및 맵 전환
    // ===================================================================
    const _Game_Player_reserveTransfer = Game_Player.prototype.reserveTransfer;
    Game_Player.prototype.reserveTransfer = function (mapId, x, y, d, fadeType) {
        if (isLoggedIn && $gameMap && $gameMap.mapId() !== mapId) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'MOVE',
                    mapId: mapId, x: x, y: y, d: d,
                    characterName: this.characterName(), characterIndex: this.characterIndex(),
                    moveSpeed: this.realMoveSpeed()
                }));
            }
        }
        _Game_Player_reserveTransfer.call(this, mapId, x, y, d, fadeType);
    };

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function () {
        clearAllRemotePlayers();
        _Spriteset_Map_createCharacters.call(this);

        // [버그 수정 핵심] 새 맵의 캐릭터 레이어가 다 그려졌으므로, 서버에 명단 갱신 전용 요청을 쏩니다.
        if (isLoggedIn && $gameMap) {
            socket.send(JSON.stringify({
                type: 'MAP_CHANGED',
                mapId: $gameMap.mapId(),
                x: $gamePlayer.x,
                y: $gamePlayer.y
            }));
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
        if (!remotePlayers[userId]) remotePlayers[userId] = new Game_NetPlayer(userId, data);
        else remotePlayers[userId].updateData(data);

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

    const _Game_Player_executeMove = Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove = function (direction) {
        _Game_Player_executeMove.call(this, direction);
        if (isLoggedIn) sendMovementPacket();
    };

    function sendMovementPacket() {
        if (socket && socket.readyState === WebSocket.OPEN && $gameMap) {
            socket.send(JSON.stringify({
                type: 'MOVE',
                mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, d: $gamePlayer.direction(),
                characterName: $gamePlayer.characterName(), characterIndex: $gamePlayer.characterIndex(),
                moveSpeed: $gamePlayer.realMoveSpeed()
            }));
        }
    }

    WebAudio._onHide = function () { };
    SceneManager.isGameActive = function () { return true; };
})();