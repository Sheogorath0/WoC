/*:
 * @target MZ
 * @plugindesc 랜덤 인카운터 시 몬스터가 플레이어를 마주보며 점프 팝업 연출
 * @author Visual Tutor
 *
 * @help
 * 랜덤 인카운터 발생 시, 전투할 몬스터의 그래픽이 플레이어 앞에 튀어나옵니다.
 * 몬스터는 항상 플레이어와 시선을 마주보는 방향으로 등장합니다.
 * * * [사용 방법]
 * 데이터베이스 -> '적 캐릭터'의 메모(Note)란에 아래와 같이 태그를 적어주세요.
 * * <MapSprite: 파일명, 인덱스>
 * * 예시) <MapSprite: Monster, 3>
 */

(() => {
    'use strict';

    const DEFAULT_IMAGE_NAME = "Monster";
    const DEFAULT_INDEX = 0;
    const ANIMATION_FRAMES = 40; // 점프 연출 프레임 (약 0.6초)

    // ===================================================================
    // 1. 연출용 커스텀 스프라이트 클래스
    // ===================================================================
    function Sprite_EncounterMonster() {
        this.initialize(...arguments);
    }

    Sprite_EncounterMonster.prototype = Object.create(Sprite.prototype);
    Sprite_EncounterMonster.prototype.constructor = Sprite_EncounterMonster;

    Sprite_EncounterMonster.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
        this._animationTime = 0;
        this._monsterRowOffset = 0; // 몬스터가 바라볼 방향 (0:아래, 1:왼쪽, 2:오른쪽, 3:위)

        this._imageName = DEFAULT_IMAGE_NAME;
        this._characterIndex = DEFAULT_INDEX;

        // 이번 전투에 등장할 몬스터 데이터 파악
        if ($gameTroop && $gameTroop.members().length > 0) {
            const enemyData = $gameTroop.members()[0].enemy();
            if (enemyData && enemyData.meta && enemyData.meta.MapSprite) {
                const parts = String(enemyData.meta.MapSprite).split(',');
                if (parts.length > 0) this._imageName = parts[0].trim();
                if (parts.length > 1) this._characterIndex = parseInt(parts[1].trim(), 10);
            }
        }

        this.bitmap = ImageManager.loadCharacter(this._imageName);
        this.setupPositionAndDirection();
        this.scale.x = 0;
        this.scale.y = 0;
        this.z = 5; // 다른 오브젝트들보다 위에 표시
    };

    Sprite_EncounterMonster.prototype.setupPositionAndDirection = function () {
        const d = $gamePlayer.direction();
        let targetX = $gamePlayer.x;
        let targetY = $gamePlayer.y;

        // 🛠️ [핵심] 플레이어의 방향에 따라 몬스터의 등장 위치와 시선을 반대로 꺾어줍니다.
        if (d === 2) {
            targetY += 1; // 플레이어가 아래를 보면 몬스터는 아래 칸에 생성
            this._monsterRowOffset = 3; // 몬스터는 위를 바라봄
        } else if (d === 4) {
            targetX -= 1; // 플레이어가 왼쪽을 보면 몬스터는 왼쪽 칸에 생성
            this._monsterRowOffset = 2; // 몬스터는 오른쪽을 바라봄
        } else if (d === 6) {
            targetX += 1; // 플레이어가 오른쪽을 보면 몬스터는 오른쪽 칸에 생성
            this._monsterRowOffset = 1; // 몬스터는 왼쪽을 바라봄
        } else if (d === 8) {
            targetY -= 1; // 플레이어가 위를 보면 몬스터는 위쪽 칸에 생성
            this._monsterRowOffset = 0; // 몬스터는 아래를 바라봄
        }

        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();

        this._baseX = $gameMap.adjustX(targetX) * tw + (tw / 2);
        this._baseY = $gameMap.adjustY(targetY) * th + th;

        this.x = this._baseX;
        this.y = this._baseY;
    };

    Sprite_EncounterMonster.prototype.update = function () {
        Sprite.prototype.update.call(this);

        // 이미지 자르기 (방향 연산 적용)
        if (this.bitmap && this.bitmap.isReady() && !this._frameSet) {
            const isBig = this._imageName.match(/^[\!\$]+/);
            const pw = this.bitmap.width / (isBig ? 3 : 12);
            const ph = this.bitmap.height / (isBig ? 4 : 8);

            const n = this._characterIndex;
            const sx = (isBig ? 1 : (n % 4 * 3 + 1)) * pw;

            // 🛠️ 몬스터가 플레이어를 마주보도록 계산된 줄(Row)을 적용합니다.
            const baseSy = (isBig ? 0 : Math.floor(n / 4) * 4);
            const sy = (baseSy + this._monsterRowOffset) * ph;

            this.setFrame(sx, sy, pw, ph);
            this._frameSet = true;
        }

        // 점프 팝업 연출
        if (this._animationTime < ANIMATION_FRAMES) {
            this._animationTime++;

            const popScale = Math.min(this._animationTime / 15, 1);
            this.scale.x = popScale;
            this.scale.y = popScale;

            const progress = this._animationTime / ANIMATION_FRAMES;
            const jumpHeight = Math.sin(progress * Math.PI) * 48;
            this.y = this._baseY - jumpHeight;
        }
    };

    // ===================================================================
    // 2. 엔진 흐름 제어 (isBusy 시스템 활용)
    // ===================================================================
    const _Scene_Map_launchBattle = Scene_Map.prototype.launchBattle;
    Scene_Map.prototype.launchBattle = function () {
        this._customEncounterDuration = ANIMATION_FRAMES;

        if (this._spriteset) {
            this._customEncounterSprite = new Sprite_EncounterMonster();
            this._spriteset.addChild(this._customEncounterSprite);
        }

        // 🛠️ [순정 기능 활용] 인카운터 돌입 시 플레이어 머리 위에 느낌표(Balloon ID: 1) 말풍선을 띄웁니다.
        if ($gamePlayer) {
            $gameTemp.requestBalloon($gamePlayer, 1);
        }
    };

    const _Scene_Map_isBusy = Scene_Map.prototype.isBusy;
    Scene_Map.prototype.isBusy = function () {
        if (this._customEncounterDuration > 0) {
            return true;
        }
        return _Scene_Map_isBusy.call(this);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);

        if (this._customEncounterDuration > 0) {
            this._customEncounterDuration--;

            if (this._customEncounterDuration === 0) {
                _Scene_Map_launchBattle.call(this);
            }
        }
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function () {
        if (this._customEncounterSprite) {
            if (this._customEncounterSprite.parent) {
                this._customEncounterSprite.parent.removeChild(this._customEncounterSprite);
            }
            this._customEncounterSprite.destroy();
            this._customEncounterSprite = null;
        }
        _Scene_Map_terminate.call(this);
    };

})();