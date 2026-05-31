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
    let _isSyncingFromServer = false;
    let _isSyncingInventoryFromServer = false;

    // ===================================================================
    // 1. 순수 네트워크 캐릭터 클래스 및 이름표
    // ===================================================================
    function Game_NetPlayer() { this.initialize(...arguments); }
    Game_NetPlayer.prototype = Object.create(Game_Character.prototype);
    Game_NetPlayer.prototype.constructor = Game_NetPlayer;
    Game_NetPlayer.prototype.initialize = function (userId, data) {
        Game_Character.prototype.initialize.call(this);
        this._userId = userId;

        // 🛠️ [split 크래시 원천 차단 쉴드 코드]
        // 엔진이 .split()을 실행하기 전에, 이 캐릭터의 기본 파일명을 무조건 "Actor1"로 선제 주입합니다.
        // 데이터가 유효하다면 서버에서 준 값을 쓰고, 없으면 안전하게 기본 갈색머리 값을 방패로 세웁니다.
        this._characterName = (data && data.characterName) ? data.characterName : "Actor1";
        this._characterIndex = (data && data.characterIndex !== undefined) ? data.characterIndex : 0;

        // 안전하게 방을 채운 뒤, 엔진의 이미지 세팅과 좌표 설정을 진행합니다.
        this.setImage(this._characterName, this._characterIndex);
        this.setPosition(data ? data.x : 5, data ? data.y : 5);

        this.setDirection(data ? (data.d || 2) : 2);
        this.setMoveSpeed(data ? (data.moveSpeed || 4) : 4);
        this.setThrough(true);
        this.setStepAnime(true);
        this._sprite = null;
        
        // ⚔️ [전투 동기화] 전투 아이콘 스프라이트 및 전투 상태 변수
        this._battleIconSprite = null;
        this._isFighting = data ? !!data.inBattle : false;
    };
    
    // ⚔️ [전투 동기화] 상태 갱신 함수
    Game_NetPlayer.prototype.setBattleStatus = function (isFighting) {
        this._isFighting = isFighting;
        if (this._battleIconSprite) {
            this._battleIconSprite.visible = isFighting;
        }
    };
    Game_NetPlayer.prototype.updateData = function (data) {
        if (!data) return;

        // 1. 방향 및 이동 속도 동기화
        this.setDirection(data.d);
        if (data.moveSpeed !== undefined) this.setMoveSpeed(data.moveSpeed);

        // 2. 좌표 동기화 (위치 변화 보정)
        const diffX = Math.abs(this._x - data.x);
        const diffY = Math.abs(this._y - data.y);
        if (diffX > 1 || diffY > 1) this.setPosition(data.x, data.y);
        else { this._x = data.x; this._y = data.y; }

        // 🛠️ [지독한 비주얼 버그를 끝낼 열쇠]
        // 좌표가 똑같아서 엔진이 연산을 패스하더라도, 파일명이나 인덱스가 달라졌는지 검사합니다.
        const validName = data.characterName || "Actor1";
        const validIndex = data.characterIndex !== undefined ? data.characterIndex : 0;

        // 만약 기존 내 외형 정보와 서버에서 날아온 새 외형 정보가 다르다면?
        if (this._characterName !== validName || this._characterIndex !== validIndex) {
            // 즉시 상대방 눈에 보이는 내 캐릭터의 이미지를 완전히 교체해 버립니다!
            this.setImage(validName, validIndex);
            this.setPattern(0); // 걷는 모션 초기화

            // 화면 프리징 상태까지 대비해 즉시 리렌더링 강제 명령
            if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
                const spriteset = SceneManager._scene._spriteset;
                const mySprite = spriteset._characterSprites.find(s => s._character === this);
                if (mySprite) {
                    if (typeof mySprite.updateBitmap === 'function') mySprite.updateBitmap();
                    mySprite.update();
                }
            }
        }
        
        // ⚔️ [전투 동기화] 전투 상태 갱신
        if (data.inBattle !== undefined) {
            this.setBattleStatus(data.inBattle);
        }
    };

    // ⚔️ [전투 동기화] 말풍선 위에 띄울 전투 아이콘 클래스 (역동적인 애니메이션 업그레이드)
    function Sprite_BattleIcon() { this.initialize(...arguments); }
    Sprite_BattleIcon.prototype = Object.create(Sprite.prototype);
    Sprite_BattleIcon.prototype.constructor = Sprite_BattleIcon;
    Sprite_BattleIcon.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);
        
        // 더 화려하고 역동적인 연출을 위해 캔버스 크기를 넉넉히 잡습니다.
        this.bitmap = new Bitmap(80, 80);
        this.bitmap.fontFace = $gameSystem.mainFontFace();
        this.bitmap.fontSize = 28;
        
        // 붉은 기운의 전투 테두리 효과를 연출하기 위해 그림자 효과 추가
        const ctx = this.bitmap.context;
        ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
        ctx.shadowBlur = 8;
        
        // 중앙에 두 개의 칼이 격돌하는 듯한 이모지 묘사
        this.bitmap.drawText("⚔️", 0, 0, 80, 80, "center");
        
        this.anchor.x = 0.5;
        this.anchor.y = 0.5; // 애니메이션 축을 중앙으로 설정
        this._baseY = -80;   // 기준 높이 (이름표보다 위로 설정)
        this.y = this._baseY;
        this.visible = false;
        
        this._tick = 0; // 애니메이션 타이머
    };

    // 프레임마다 호출되어 화려하고 역동적인 모션을 연출합니다.
    Sprite_BattleIcon.prototype.update = function () {
        Sprite.prototype.update.call(this);
        if (this.visible) {
            this._tick++;

            // 1. 상하로 부드럽게 둥실둥실 뜨는 효과 (Sine파 이용, 속도를 0.08 -> 0.04로 50% 감속)
            const floatY = Math.sin(this._tick * 0.04) * 8;
            
            // 2. 치열한 격투를 나타내는 좌우 미세 진동 (Cosine파 이용, 속도를 0.4 -> 0.2로 50% 감속)
            const shakeX = Math.cos(this._tick * 0.2) * 2;
            
            this.x = shakeX;
            this.y = this._baseY + floatY;

            // 3. 심장박동처럼 팽창했다 수축하는 호흡 효과 (속도를 0.15 -> 0.075로 50% 감속)
            const scale = 1.05 + Math.sin(this._tick * 0.075) * 0.1;
            this.scale.x = scale;
            this.scale.y = scale;
            
            // 4. 각도를 아주 미세하게 좌우로 흔들어 생동감 강화 (속도를 0.1 -> 0.05로 50% 감속)
            this.rotation = Math.sin(this._tick * 0.05) * 0.08;
        }
    };

    // Sprite_NetNameTag은 RS_EventName.js 플러그인에서 보다 향상된 형태로 처리하므로 더 이상 NetCoreMZ.js에서 직접 그리지 않습니다.

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
            case 'LOGIN_SUCCESS':
                isLoggedIn = true;
                myNetId = packet.id;

                DataManager.setupNewGame();

                // 🛠️ [개인/공유 스위치 및 변수 복구]
                _isSyncingFromServer = true;
                if (packet.switches) {
                    for (const id in packet.switches) {
                        $gameSwitches.setValue(Number(id), packet.switches[id]);
                    }
                }
                if (packet.variables) {
                    for (const id in packet.variables) {
                        $gameVariables.setValue(Number(id), packet.variables[id]);
                    }
                }
                if (packet.sharedSwitches) {
                    for (const id in packet.sharedSwitches) {
                        $gameSwitches.setValue(Number(id), packet.sharedSwitches[id]);
                    }
                }
                if (packet.sharedVariables) {
                    for (const id in packet.sharedVariables) {
                        $gameVariables.setValue(Number(id), packet.sharedVariables[id]);
                    }
                }
                _isSyncingFromServer = false;

                // 🛠️ [골드 및 인벤토리 데이터 복구]
                _isSyncingInventoryFromServer = true;
                if (packet.gold !== undefined) $gameParty._gold = packet.gold;
                if (packet.weapons) $gameParty._weapons = packet.weapons;
                if (packet.armors) $gameParty._armors = packet.armors;
                if (packet.items) $gameParty._items = packet.items;
                _isSyncingInventoryFromServer = false;

                // 🛠️ [경매장 전역 객체 초기화]
                window.$gameAuction = window.$gameAuction || { list: [], pendingIncome: 0 };
                window.$gameAuction.pendingIncome = packet.pendingIncome || 0;

                $gamePlayer.reserveTransfer(packet.mapId || 1, packet.x, packet.y, 2, 0);

                // 🛠️ [split 에러 완벽 차단 안전장치]
                // 다른 유저들의 정보를 방에 등록하기 전에, '기존 유저 데이터'가 실제로 존재하는지 
                // 그리고 내 엔진이 그 데이터를 받아들일 준비(packet)가 확실히 되었는지 검증합니다.
                if (packet.existingPlayers && typeof packet.existingPlayers === 'object') {
                    for (const id in packet.existingPlayers) {
                        // 내 아이디가 아니고, 해당 유저의 맵 ID가 유효할 때만 안전하게 캐릭터 객체 생성
                        if (id !== myNetId && packet.existingPlayers[id] && packet.existingPlayers[id].mapId === (packet.mapId || 1)) {
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

            case 'PLAYER_BATTLE_STATUS':
                if (remotePlayers[packet.userId]) {
                    remotePlayers[packet.userId].setBattleStatus(packet.isFighting);
                }
                break;

            case 'SYNC_SHARED_DATA':
                _isSyncingFromServer = true;
                if (packet.isSwitch) {
                    $gameSwitches.setValue(packet.id, packet.value);
                } else {
                    $gameVariables.setValue(packet.id, packet.value);
                }
                _isSyncingFromServer = false;

                // 실시간 스위치/변수 업데이트에 반응하도록 맵 이벤트들을 즉시 갱신
                if ($gameMap) {
                    $gameMap.requestRefresh();
                }
                break;

            case 'AUCTION_LIST_RESPONSE':
            case 'AUCTION_UPDATE':
                if (window.$gameAuction) {
                    window.$gameAuction.list = packet.list;
                    if (packet.pendingIncome !== undefined) {
                        window.$gameAuction.pendingIncome = packet.pendingIncome;
                    }
                }
                break;

            case 'AUCTION_REGISTER_SUCCESS':
                SoundManager.playShop();
                // 서버에서 등록 성공했으므로 클라이언트 인벤토리에서도 동기화 생략 상태에서 차감 처리
                _isSyncingInventoryFromServer = true;
                {
                    let db = $dataWeapons;
                    if (packet.itemType === 'armor') db = $dataArmors;
                    if (packet.itemType === 'item') db = $dataItems;
                    $gameParty.loseItem(db[packet.itemId], packet.quantity || 1);
                }
                _isSyncingInventoryFromServer = false;
                
                // 경매장 씬 활성화 시 판매 인벤토리 목록을 즉시 갱신
                if (SceneManager._scene && SceneManager._scene.constructor.name === "Scene_Auction" && typeof SceneManager._scene.refreshSellWindow === "function") {
                    SceneManager._scene.refreshSellWindow();
                }
                break;

            case 'AUCTION_BUY_SUCCESS':
                SoundManager.playShop();
                // 이미 서버에서 골드를 깎고 아이템을 지급했지만 클라이언트 엔진 반영을 위해 동기화 생략 후 로컬 갱신
                _isSyncingInventoryFromServer = true;
                $gameParty.loseGold(packet.price);
                {
                    let db = $dataWeapons;
                    if (packet.itemType === 'armor') db = $dataArmors;
                    if (packet.itemType === 'item') db = $dataItems;
                    $gameParty.gainItem(db[packet.itemId], packet.quantity || 1);
                }
                _isSyncingInventoryFromServer = false;
                break;

            case 'AUCTION_CLAIM_SUCCESS':
                SoundManager.playShop();
                _isSyncingInventoryFromServer = true;
                $gameParty.gainGold(packet.amount);
                _isSyncingInventoryFromServer = false;
                if (window.$gameAuction) window.$gameAuction.pendingIncome = 0;
                break;

            case 'AUCTION_FAIL':
                SoundManager.playBuzzer();
                console.warn("경매장 에러:", packet.message);
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

        // NameTag 처리는 RS_EventName.js가 담당하므로 여기서는 삭제
        
        // ⚔️ [전투 동기화] 아이콘 스프라이트 부착
        const battleIcon = new Sprite_BattleIcon();
        sprite.addChild(battleIcon);
        netPlayer._battleIconSprite = battleIcon;

        // 기존에 전투 중이었다면 즉시 보이도록
        if (netPlayer._isFighting) {
            battleIcon.visible = true;
        }
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
                mapId: $gameMap.mapId(),
                x: $gamePlayer.x,
                y: $gamePlayer.y,
                d: $gamePlayer.direction(),

                // 🛠️ [진짜 해결책] 고정된 과거 변수를 과감히 지우고, 
                // 현재 내 캐릭터 객체가 맵 위에서 진짜로 렌더링하고 있는 파일명과 인덱스를 실시간으로 털어서 보냅니다!
                characterName: $gamePlayer.characterName(),
                characterIndex: $gamePlayer.characterIndex(),

                moveSpeed: $gamePlayer.realMoveSpeed()
            }));
        }
    }

    WebAudio._onHide = function () { };
    SceneManager.isGameActive = function () { return true; };

    // ===================================================================
    // 4. 알만툴 순정 이벤트(파티원 변경 등) 감지 및 실시간 외형 동기화 (최종 안정화)
    // ===================================================================
    const _Game_Player_refresh = Game_Player.prototype.refresh;
    Game_Player.prototype.refresh = function () {
        // 1. 알만툴 순정 리프레시 로직을 먼저 완벽하게 수행합니다.
        _Game_Player_refresh.call(this);

        // 2. [핵심] 엔진이 데이터를 완전히 정착시킬 수 있도록 0프레임 지연(setTimeout 0) 처리를 합니다.
        // 이렇게 하면 빈 문자열("")이 추출되는 타이밍 버그를 완벽히 우회합니다.
        setTimeout(() => {
            if (typeof isLoggedIn !== 'undefined' && isLoggedIn && socket && socket.readyState === WebSocket.OPEN && $gameMap) {

                let currentName = this.characterName();
                let currentIndex = this.characterIndex();

                // 3. [2중 방어] 만약 여전히 공백이거나 누락되었다면, 데이터베이스 1번 파티원의 진짜 외형을 역추적합니다.
                if (!currentName && $gameParty.leader()) {
                    currentName = $gameParty.leader().characterName();
                    currentIndex = $gameParty.leader().characterIndex();
                }

                // 데이터가 유효할 때만 최종적으로 패킷을 발송합니다.
                if (currentName) {
                    socket.send(JSON.stringify({
                        type: 'MOVE',
                        mapId: $gameMap.mapId(),
                        x: this.x,
                        y: this.y,
                        d: this.direction(),
                        characterName: currentName,
                        characterIndex: currentIndex,
                        moveSpeed: this.realMoveSpeed()
                    }));

                    console.log(`[Network] 순정 이벤트 최종 동기화 완료: ${currentName}(${currentIndex})`);
                }
            }
        }, 0);
    };

    // ===================================================================
    // 5. ⚔️ 전투 상태 동기화
    // ===================================================================

    // 전투 씬으로 넘어가는 로직 가로채기 (상태 전송)
    const _SceneManager_push = SceneManager.push;
    SceneManager.push = function(sceneClass) {
        if (sceneClass === Scene_Battle) {
            if (isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'BATTLE_START' }));
            }
        }
        _SceneManager_push.call(this, sceneClass);
    };

    // 전투 종료 감지 (맵으로 복귀할 때)
    const _Scene_Battle_terminate = Scene_Battle.prototype.terminate;
    Scene_Battle.prototype.terminate = function() {
        _Scene_Battle_terminate.call(this);
        if (isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'BATTLE_END' }));
        }
    };

    // ===================================================================
    // 6. 스위치 및 변수 멀티플레이어 실시간 동기화 시스템
    // ===================================================================
    // 101번 ~ 200번 범위는 모든 플레이어 간 실시간 동기화되는 [공유 데이터] 영역입니다.
    // 그 외 범위는 각 플레이어의 세션 프로필 데이터에 독립 저장되는 [개인 데이터] 영역입니다.
    const SHARED_SWITCH_START = 101;
    const SHARED_SWITCH_END = 200;
    const SHARED_VAR_START = 101;
    const SHARED_VAR_END = 200;

    function isSharedSwitch(id) {
        return id >= SHARED_SWITCH_START && id <= SHARED_SWITCH_END;
    }

    function isSharedVariable(id) {
        return id >= SHARED_VAR_START && id <= SHARED_VAR_END;
    }

    const _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        const oldValue = this.value(switchId);
        _Game_Switches_setValue.call(this, switchId, value);
        
        if (oldValue !== value && !_isSyncingFromServer && isLoggedIn) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                if (isSharedSwitch(switchId)) {
                    // 공유 스위치 전송 (실시간 전체 공유)
                    socket.send(JSON.stringify({
                        type: 'SYNC_SHARED_DATA',
                        isSwitch: true,
                        id: switchId,
                        value: value
                    }));
                } else {
                    // 개인 스위치 전송 (서버 데이터 세이브용)
                    socket.send(JSON.stringify({
                        type: 'SYNC_PERSONAL_DATA',
                        isSwitch: true,
                        id: switchId,
                        value: value
                    }));
                }
            }
        }
    };

    const _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        const oldValue = this.value(variableId);
        _Game_Variables_setValue.call(this, variableId, value);
        
        if (oldValue !== value && !_isSyncingFromServer && isLoggedIn) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                if (isSharedVariable(variableId)) {
                    // 공유 변수 전송 (실시간 전체 공유)
                    socket.send(JSON.stringify({
                        type: 'SYNC_SHARED_DATA',
                        isSwitch: false,
                        id: variableId,
                        value: value
                    }));
                } else {
                    // 개인 변수 전송 (서버 데이터 세이브용)
                    socket.send(JSON.stringify({
                        type: 'SYNC_PERSONAL_DATA',
                        isSwitch: false,
                        id: variableId,
                        value: value
                    }));
                }
            }
        }
    };

    // ===================================================================
    // 7. 인벤토리 및 골드 실시간 서버 저장 시스템 (경매장 기반)
    // ===================================================================
    const _Game_Party_gainGold = Game_Party.prototype.gainGold;
    Game_Party.prototype.gainGold = function(amount) {
        _Game_Party_gainGold.call(this, amount);
        if (!_isSyncingInventoryFromServer && isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'SYNC_GOLD', gold: this._gold }));
        }
    };

    const _Game_Party_loseGold = Game_Party.prototype.loseGold;
    Game_Party.prototype.loseGold = function(amount) {
        _Game_Party_loseGold.call(this, amount);
        if (!_isSyncingInventoryFromServer && isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'SYNC_GOLD', gold: this._gold }));
        }
    };

    const _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        _Game_Party_gainItem.call(this, item, amount, includeEquip);
        if (!_isSyncingInventoryFromServer && isLoggedIn && socket && socket.readyState === WebSocket.OPEN && item) {
            socket.send(JSON.stringify({
                type: 'SYNC_INVENTORY',
                weapons: this._weapons,
                armors: this._armors,
                items: this._items
            }));
        }
    };

    // 경매장 UI 플러그인 등 외부에서 서버로 패킷을 쏠 수 있는 전역 인터페이스
    window.$gameAuction = window.$gameAuction || { list: [], pendingIncome: 0 };
    window.$gameAuction.sendPacket = function(packet) {
        if (isLoggedIn && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(packet));
        }
    };

})();