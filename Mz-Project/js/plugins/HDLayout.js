//=============================================================================
// RPG Maker MZ - HDLayout
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Optimizes screen layout for 1280x720. Adjusts the placement of various windows and gauges.
 * @author nz_prism
 * @base ActorPictures
 * @base AltMenuScreen
 * @orderAfter ActorPictures
 * @orderAfter AltMenuScreen
 *
 * @help HDLayout.js
 * ver. 1.0.0
 * 
 * [History]
 * 10/20/2025 1.0.0 Released
 * 
 * This plugin optimizes the layout of windows and gauges for a game screen
 * size of 1280x720.
 * 
 * It requires the following two plugins to be installed beforehand.
 * Please place this plugin below them.
 * - ActorPictures.js (Actor Picture Settings Plugin)
 * - AltMenuScreen.js (Menu Screen Customization Plugin)
 * 
 * When this plugin is enabled, the layouts of various windows in the Skill,
 * Equip, and Status screens are adjusted to fit the 1280x720 size. You can
 * also adjust the width of the message window and status gauges, as well as
 * the position of side-view battle actors. For details, please refer to the
 * plugin parameters.
 * 
 * This plugin displays actor pictures in the Menu, Skill, Equip, and Status
 * screens, so you need to configure the parameters of the ActorPictures.js
 * plugin. For details, please refer to the plugin help of ActorPictures.js.
 * If no picture is set for an actor, nothing will be displayed in the
 * picture area.
 * 
 * This plugin does not include any plugin commands.
 * 
 * This plugin is released under the MIT License.
 * https://opensource.org/licenses/mit-license.php
 * 
 *
 * @param commonSettings
 * @text Common Settings
 * @desc Settings common to all scenes.
 * 
 * @param messageWindowWidth
 * @text Message Window Width
 * @desc The width of the message window.
 * @parent commonSettings
 * @type number
 * @default 840
 * 
 * @param gaugeSettings
 * @text Gauge Settings
 * @desc Settings related to status gauges.
 * @parent commonSettings
 * 
 * @param gaugeWidth
 * @text Gauge Width
 * @desc The width of the status gauges.
 * @parent gaugeSettings
 * @type number
 * @default 200
 * 
 * @param drawGaugeMaxValue
 * @text Draw Gauge Max Value
 * @desc If ON, the maximum value of the status gauge will be displayed.
 * @parent gaugeSettings
 * @type boolean
 * @default true
 * 
 * @param gaugeMaxValueColor
 * @text Gauge Max Value Color
 * @desc The color of the maximum value of the status gauge.
 * @parent drawGaugeMaxValue
 * @type color
 * @default 16
 * 
 * 
 * @param battleSettings
 * @text Battle Settings
 * @desc Settings related to the battle scene.
 * 
 * @param gaugeOffsetX
 * @text Gauge Offset X
 * @desc The value to offset the status gauge horizontally.
 * @parent battleSettings
 * @type number
 * @default 12
 * 
 * @param battleCommandWindowWidth
 * @text Battle Command Window Width
 * @desc The width of the battle command window.
 * @parent battleSettings
 * @type number
 * @default 280
 * 
 * @param svActorCoordinate
 * @text SV Actor Base Coordinates
 * @desc The base coordinates of side-view actors. Not needed for front-view battles.
 * @parent battleSettings
 * 
 * @param svActorBaseX
 * @text SV Actor Base X
 * @desc The base X coordinate of side-view actors.
 * @parent svActorCoordinate
 * @type number
 * @default 960
 * 
 * @param svActorBaseY
 * @text SV Actor Base Y
 * @desc The base Y coordinate of side-view actors.
 * @parent svActorCoordinate
 * @type number
 * @default 360
 * 
 * 
 * @param menuSettings
 * @text Menu Settings
 * @desc Settings related to the menu screen.
 * 
 * @param drawMenuStatusBackground
 * @text Draw Menu Status Background
 * @desc If ON, the background of the status window in the menu screen will be darkened.
 * @parent menuSettings
 * @type boolean
 * @default true
 * 
 * 
 * @param skillSettings
 * @text Skill Settings
 * @desc Settings related to the skill screen.
 * 
 * @param drawSkillStatusBackground
 * @text Draw Skill Status Background
 * @desc If ON, the background of the status window in the skill screen will be darkened.
 * @parent skillSettings
 * @type boolean
 * @default true
 * 
 * @param skillCommandWindowWidth
 * @text Skill Command Window Width
 * @desc The width of the skill command window.
 * @parent skillSettings
 * @type number
 * @default 320
 * 
 * 
 * @param equipSettings
 * @text Equip Settings
 * @desc Settings related to the equip screen.
 * 
 * @param drawEquipStatusBackground
 * @text Draw Equip Status Background
 * @desc If ON, the background of the status window in the equip screen will be darkened.
 * @parent equipSettings
 * @type boolean
 * @default true
 * 
 * @param statusWindowWidth
 * @text Status Window Width
 * @desc The width of the status window.
 * @parent equipSettings
 * @type number
 * @default 320
 * 
 * @param slotWindowWidth
 * @text Slot Window Width
 * @desc The width of the equip window.
 * @parent equipSettings
 * @type number
 * @default 496
 * 
 * @param statusSettings
 * @text Status Settings
 * @desc Settings related to the status screen.
 * 
 * @param drawStatusInfoBackground
 * @text Draw Status Info Background
 * @desc If ON, the background of the gauges and experience points in the status screen will be darkened.
 * @parent statusSettings
 * @type boolean
 * @default true
 * 
 * @param paramWindowWidth
 * @text Parameter Window Width
 * @desc The width of the parameter window.
 * @parent statusSettings
 * @type number
 * @default 464
 * 
 * @param infoOffsetX
 * @text Status Info Offset X
 * @desc The value to offset the drawing position of gauges and experience points from the left edge in the status screen.
 * @parent statusSettings
 * @type number
 * @default 28
 * 
 * @param expOffsetY
 * @text Experience Offset Y
 * @desc The value to offset the drawing position of experience points downward from the gauges in the status screen.
 * @parent statusSettings
 * @type number
 * @default 320
 * 
 * @param paramOffsetX
 * @text Parameter Offset X
 * @desc The value to offset the drawing position of parameters from the right edge in the status screen.
 * @parent statusSettings
 * @type number
 * @default 48
 * 
 */

/*:ja
 * @target MZ
 * @plugindesc 画面レイアウトを1280x720に最適化します。各種ウィンドウやゲージの配置を調整することができます。
 * @author nz_prism
 * @base ActorPictures
 * @base AltMenuScreen
 * @orderAfter ActorPictures
 * @orderAfter AltMenuScreen
 *
 * @help HDLayout.js
 * ver. 1.0.0
 * 
 * [バージョン履歴]
 * 2025/10/20 1.0.0 リリース
 * 
 * このプラグインは、各シーンのウィンドウやゲージ等の配置方法を、ゲーム画面サ
 * イズ1280x720に最適化します。
 * 
 * 下記2つのプラグインの導入が前提となります。
 * これらよりも下に配置してください。
 * - ActorPictures.js (アクター立ち絵設定プラグイン)
 * - AltMenuScreen.js (メニュー画面カスタマイズプラグイン)
 * 
 * このプラグインを有効化すると、スキル、装備、ステータス画面の各種ウィンドウ
 * レイアウトが1280x720サイズに合わせて変更されます。またメッセージウィンドウ
 * やステータスゲージの幅、サイドビュー戦闘の立ち位置などを調整することも可能
 * です。詳細はプラグインパラメータをご覧ください。
 * 
 * 本プラグインはメニュー・スキル・装備・ステータス画面においてアクターの立ち
 * 絵を表示するため、ActorPictures.jsプラグインのパラメータ設定が必要です。
 * 詳細はActorPictures.jsのプラグインヘルプをご覧ください。
 * アクターに立ち絵が設定されていない場合、立ち絵表示位置には何も表示されませ
 * ん。
 * 
 * 本プラグインには、プラグインコマンドはありません。
 * 
 * このプラグインはMITライセンスにてリリースされています。
 * https://opensource.org/licenses/mit-license.php
 * 
 *
 * @param commonSettings
 * @text 共通設定
 * @desc 各シーンに共通する設定です。
 * 
 * @param messageWindowWidth
 * @text メッセージウィンドウ幅
 * @desc メッセージウィンドウの幅です。
 * @parent commonSettings
 * @type number
 * @default 840
 * 
 * @param gaugeSettings
 * @text ゲージ設定
 * @desc ステータスゲージに関する設定です。
 * @parent commonSettings
 * 
 * @param gaugeWidth
 * @text ゲージ幅
 * @desc ステータスゲージの幅です。
 * @parent gaugeSettings
 * @type number
 * @default 200
 * 
 * @param drawGaugeMaxValue
 * @text ゲージ最大値描画
 * @desc オンにすると、ステータスゲージの最大値を描画します。
 * @parent gaugeSettings
 * @type boolean
 * @default true
 * 
 * @param gaugeMaxValueColor
 * @text ゲージ最大値色
 * @desc ステータスゲージの最大値の色です。
 * @parent drawGaugeMaxValue
 * @type color
 * @default 16
 * 
 * 
 * @param battleSettings
 * @text 戦闘設定
 * @desc 戦闘シーンに関する設定です。
 * 
 * @param gaugeOffsetX
 * @text ゲージオフセットX
 * @desc ステータスゲージを水平方向にずらす値です。
 * @parent battleSettings
 * @type number
 * @default 12
 * 
 * @param battleCommandWindowWidth
 * @text 戦闘コマンドウィンドウ幅
 * @desc 戦闘コマンドウィンドウの幅です。
 * @parent battleSettings
 * @type number
 * @default 280
 * 
 * @param svActorCoordinate
 * @text SVアクターベース座標
 * @desc サイドビューアクターの基本座標です。フロントビュー戦闘の場合、設定不要です。
 * @parent battleSettings
 * 
 * @param svActorBaseX
 * @text SVアクターベースX
 * @desc サイドビューアクターの基本X座標です。
 * @parent svActorCoordinate
 * @type number
 * @default 960
 * 
 * @param svActorBaseY
 * @text SVアクターベースY
 * @desc サイドビューアクターの基本Y座標です。
 * @parent svActorCoordinate
 * @type number
 * @default 360
 * 
 * 
 * @param menuSettings
 * @text メニュー設定
 * @desc メニュー画面に関する設定です。
 * 
 * @param drawMenuStatusBackground
 * @text メニューステータス背景描画
 * @desc オンにすると、メニュー画面のステータスウィンドウの背景を暗く描画します。
 * @parent menuSettings
 * @type boolean
 * @default true
 * 
 * 
 * @param skillSettings
 * @text スキル設定
 * @desc スキル画面に関する設定です。
 * 
 * @param drawSkillStatusBackground
 * @text スキルステータス背景描画
 * @desc オンにすると、スキル画面のステータスウィンドウの背景を暗く描画します。
 * @parent skillSettings
 * @type boolean
 * @default true
 * 
 * @param skillCommandWindowWidth
 * @text スキルコマンドウィンドウ幅
 * @desc スキルコマンドウィンドウの幅です。
 * @parent skillSettings
 * @type number
 * @default 320
 * 
 * 
 * @param equipSettings
 * @text 装備設定
 * @desc 装備画面に関する設定です。
 * 
 * @param drawEquipStatusBackground
 * @text 装備ステータス背景描画
 * @desc オンにすると、装備画面のステータスウィンドウの背景を暗く描画します。
 * @parent equipSettings
 * @type boolean
 * @default true
 * 
 * @param statusWindowWidth
 * @text ステータスウィンドウ幅
 * @desc ステータスウィンドウの幅です。
 * @parent equipSettings
 * @type number
 * @default 320
 * 
 * @param slotWindowWidth
 * @text 装備ウィンドウ幅
 * @desc 装備ウィンドウの幅です。
 * @parent equipSettings
 * @type number
 * @default 496
 * 
 * @param statusSettings
 * @text ステータス設定
 * @desc ステータス画面に関する設定です。
 * 
 * @param drawStatusInfoBackground
 * @text ステータス情報背景描画
 * @desc オンにすると、ステータス画面のゲージおよび経験値の背景を暗く描画します。
 * @parent statusSettings
 * @type boolean
 * @default true
 * 
 * @param paramWindowWidth
 * @text 能力値ウィンドウ幅
 * @desc 能力値ウィンドウの幅です。
 * @parent statusSettings
 * @type number
 * @default 464
 * 
 * @param infoOffsetX
 * @text ステータス情報オフセットX
 * @desc ステータス画面のゲージおよび経験値の描画位置を左端からずらす値です。
 * @parent statusSettings
 * @type number
 * @default 28
 * 
 * @param expOffsetY
 * @text 経験値オフセットY
 * @desc ステータス画面の経験値の描画位置をゲージから下方向にずらす値です。
 * @parent statusSettings
 * @type number
 * @default 320
 * 
 * @param paramOffsetX
 * @text 能力値オフセットX
 * @desc ステータス画面の能力値の描画位置を右端からずらす値です。
 * @parent statusSettings
 * @type number
 * @default 48
 * 
 */

/*:zh
 * @target MZ
 * @plugindesc 为1280x720分辨率优化的屏幕布局。可调整各类窗口和数值条的位置。
 * @author nz_prism
 * @base ActorPictures
 * @base AltMenuScreen
 * @orderAfter ActorPictures
 * @orderAfter AltMenuScreen
 *
 * @help HDLayout.js
 * ver. 1.0.0
 * 
 * 【版本历史】
 * 2025/10/20 1.0.0 发布
 * 
 * 本插件针对1280x720的游戏画面优化了窗口和数值条的布局。
 * 
 * 使用本插件前需先安装以下两个插件，并将本插件放置在它们的下方：
 * - ActorPictures.js（角色立绘设置插件）
 * - AltMenuScreen.js（菜单画面自定义插件）
 * 
 * 启用本插件后，技能、装备和状态画面的窗口布局将调整以适配1280x720分辨率。
 * 你还可以调整消息窗口宽度、状态数值条宽度以及侧视战斗角色的位置。
 * 详细信息请参阅插件参数。
 * 
 * 本插件会在菜单、技能、装备和状态画面中显示角色立绘，
 * 因此需要正确设置ActorPictures.js插件的参数。
 * 详情请参阅ActorPictures.js的帮助。
 * 如果角色未设置立绘，则立绘区域不会显示任何内容。
 * 
 * 本插件不包含任何插件命令。
 * 
 * 本插件在MIT许可证下发布。
 * https://opensource.org/licenses/mit-license.php
 * 
 *
 * @param commonSettings
 * @text 通用设置
 * @desc 所有场景的通用设置。
 * 
 * @param messageWindowWidth
 * @text 消息窗口宽度
 * @desc 消息窗口的宽度。
 * @parent commonSettings
 * @type number
 * @default 840
 * 
 * @param gaugeSettings
 * @text 数值条设置
 * @desc 与状态数值条相关的设置。
 * @parent commonSettings
 * 
 * @param gaugeWidth
 * @text 数值条宽度
 * @desc 状态数值条的宽度。
 * @parent gaugeSettings
 * @type number
 * @default 200
 * 
 * @param drawGaugeMaxValue
 * @text 显示数值条最大值
 * @desc 启用时，会显示状态数值条的最大值。
 * @parent gaugeSettings
 * @type boolean
 * @default true
 * 
 * @param gaugeMaxValueColor
 * @text 数值条最大值颜色
 * @desc 状态数值条最大值的颜色。
 * @parent drawGaugeMaxValue
 * @type color
 * @default 16
 * 
 * 
 * @param battleSettings
 * @text 战斗设置
 * @desc 与战斗场景相关的设置。
 * 
 * @param gaugeOffsetX
 * @text 数值条X偏移
 * @desc 状态数值条在水平方向上的偏移值。
 * @parent battleSettings
 * @type number
 * @default 12
 * 
 * @param battleCommandWindowWidth
 * @text 战斗指令窗口宽度
 * @desc 战斗指令窗口的宽度。
 * @parent battleSettings
 * @type number
 * @default 280
 * 
 * @param svActorCoordinate
 * @text 侧视角色基准坐标
 * @desc 侧视战斗角色的基准坐标。若为正面战斗则无需设置。
 * @parent battleSettings
 * 
 * @param svActorBaseX
 * @text 侧视角色基准X
 * @desc 侧视战斗角色的基准X坐标。
 * @parent svActorCoordinate
 * @type number
 * @default 960
 * 
 * @param svActorBaseY
 * @text 侧视角色基准Y
 * @desc 侧视战斗角色的基准Y坐标。
 * @parent svActorCoordinate
 * @type number
 * @default 360
 * 
 * 
 * @param menuSettings
 * @text 菜单设置
 * @desc 与菜单画面相关的设置。
 * 
 * @param drawMenuStatusBackground
 * @text 绘制菜单状态背景
 * @desc 启用时，将使菜单画面的状态窗口背景变暗。
 * @parent menuSettings
 * @type boolean
 * @default true
 * 
 * 
 * @param skillSettings
 * @text 技能设置
 * @desc 与技能画面相关的设置。
 * 
 * @param drawSkillStatusBackground
 * @text 绘制技能状态背景
 * @desc 启用时，将使技能画面的状态窗口背景变暗。
 * @parent skillSettings
 * @type boolean
 * @default true
 * 
 * @param skillCommandWindowWidth
 * @text 技能指令窗口宽度
 * @desc 技能指令窗口的宽度。
 * @parent skillSettings
 * @type number
 * @default 320
 * 
 * 
 * @param equipSettings
 * @text 装备设置
 * @desc 与装备画面相关的设置。
 * 
 * @param drawEquipStatusBackground
 * @text 绘制装备状态背景
 * @desc 启用时，将使装备画面的状态窗口背景变暗。
 * @parent equipSettings
 * @type boolean
 * @default true
 * 
 * @param statusWindowWidth
 * @text 状态窗口宽度
 * @desc 状态窗口的宽度。
 * @parent equipSettings
 * @type number
 * @default 320
 * 
 * @param slotWindowWidth
 * @text 装备窗口宽度
 * @desc 装备窗口的宽度。
 * @parent equipSettings
 * @type number
 * @default 496
 * 
 * @param statusSettings
 * @text 状态设置
 * @desc 与状态画面相关的设置。
 * 
 * @param drawStatusInfoBackground
 * @text 绘制状态信息背景
 * @desc 启用时，将使状态画面的数值条和经验值区域背景变暗。
 * @parent statusSettings
 * @type boolean
 * @default true
 * 
 * @param paramWindowWidth
 * @text 参数窗口宽度
 * @desc 参数窗口的宽度。
 * @parent statusSettings
 * @type number
 * @default 464
 * 
 * @param infoOffsetX
 * @text 状态信息X偏移
 * @desc 状态画面中数值条和经验值绘制位置相对左侧的偏移值。
 * @parent statusSettings
 * @type number
 * @default 28
 * 
 * @param expOffsetY
 * @text 经验值Y偏移
 * @desc 状态画面中经验值绘制位置相对于数值条向下的偏移值。
 * @parent statusSettings
 * @type number
 * @default 320
 * 
 * @param paramOffsetX
 * @text 参数X偏移
 * @desc 状态画面中参数绘制位置相对于右侧的偏移值。
 * @parent statusSettings
 * @type number
 * @default 48
 * 
 */

(() => {
    'use strict';
    const PLUGIN_NAME = "HDLayout";
    const pluginParams = PluginManager.parameters(PLUGIN_NAME);

	// Common
    const MESSAGE_WINDOW_WIDTH = Number(pluginParams.messageWindowWidth);
	const GAUGE_WIDTH = Number(pluginParams.gaugeWidth);
	const DRAW_GAUGE_MAX_VALUE = (pluginParams.drawGaugeMaxValue === "true");
	const GAUGE_MAX_VALUE_COLOR = Number(pluginParams.gaugeMaxValueColor);

	// Scene_Battle
    const BATTLE_COMMAND_WINDOW_WIDTH = Number(pluginParams.battleCommandWindowWidth);
    const GAUGE_OFFSET_X = Number(pluginParams.gaugeOffsetX);
    const SV_ACTOR_BASE_X = Number(pluginParams.svActorBaseX);
    const SV_ACTOR_BASE_Y = Number(pluginParams.svActorBaseY);

	// Scene_Menu
	const DRAW_MENU_STATUS_BACKGROUND = (pluginParams.drawMenuStatusBackground === "true");

	// Scene_Skill
	const DRAW_SKILL_STATUS_BACKGROUND = (pluginParams.drawSkillStatusBackground === "true");
	const SKILL_COMMAND_WINDOW_WIDTH = Number(pluginParams.skillCommandWindowWidth);

	// Scene_Equip
	const DRAW_EQUIP_STATUS_BACKGROUND = (pluginParams.drawEquipStatusBackground === "true");
	const STATUS_WINDOW_WIDTH = Number(pluginParams.statusWindowWidth);
	const SLOT_WINDOW_WIDTH = Number(pluginParams.slotWindowWidth);

	// Scene_Status
	const DRAW_STATUS_INFO_BACKGROUND = (pluginParams.drawStatusInfoBackground === "true");
	const STATUS_PARAMS_WINDOW_WIDTH = Number(pluginParams.paramWindowWidth);
	const INFO_OFFSET_X = Number(pluginParams.infoOffsetX);
	const EXP_OFFSET_Y = Number(pluginParams.expOffsetY);
	const PARAM_OFFSET_X = Number(pluginParams.paramOffsetX);


	//-----------------------------------------------------------------------------
    // Common
    //-----------------------------------------------------------------------------

	Sprite_Gauge.prototype.bitmapWidth = function() {
        return GAUGE_WIDTH;
    };

	const _Sprite_Gauge_prototype_drawValue = Sprite_Gauge.prototype.drawValue;
    Sprite_Gauge.prototype.drawValue = function() {
		if (DRAW_GAUGE_MAX_VALUE) {
			this.setupValueFont();
			const width = this.bitmapWidth();
			const height = this.textHeight();
			const currentText = String(this.currentValue()) + "".padStart(8);
			const currentMaxText = "/" + String(this.currentMaxValue()).padStart(5);
			this.bitmap.drawText(currentText, 0, 0, width, height, "right");
			this.bitmap.textColor = ColorManager.textColor(GAUGE_MAX_VALUE_COLOR);
			this.bitmap.drawText(currentMaxText, 0, 0, width, height, "right");
		} else {
			_Sprite_Gauge_prototype_drawValue.call(this);
		}
    };


	Scene_Message.prototype.messageWindowRect = function() {
        const ww = MESSAGE_WINDOW_WIDTH
        const wh = this.calcWindowHeight(4, false) + 8;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = 0;
        return new Rectangle(wx, wy, ww, wh);
    };


	Window_Base.prototype.drawGradientGrayRect = function(rect) {
        const c1 = ColorManager.itemBackColor1();
        const c2 = ColorManager.itemBackColor2();
        const x = rect.x;
        const y = rect.y;
        const w = rect.width;
        const h = rect.height;
        this.contents.gradientFillRect(x, y, w, h, c1, c2, true);
        this.contents.strokeRect(x, y, w, h, c1);
    };


	Window_Message.prototype.createDimmerSprite = function() {
        this._dimmerSprite = new Sprite();
        this._dimmerSprite.bitmap = new Bitmap(0, 0);
        this._dimmerSprite.x = -((Graphics.width - MESSAGE_WINDOW_WIDTH)/2);
        this.addChildToBack(this._dimmerSprite);
    };

    Window_Message.prototype.refreshDimmerBitmap = function() {
        if (this._dimmerSprite) {
            const bitmap = this._dimmerSprite.bitmap;
            const w = this.width > 0 ? this.width + (Graphics.width - MESSAGE_WINDOW_WIDTH) : 0;
            const h = this.height;
            const m = this.padding;
            const c1 = ColorManager.dimColor1();
            const c2 = ColorManager.dimColor2();
            bitmap.resize(w, h);
            bitmap.gradientFillRect(0, 0, w, m, c2, c1, true);
            bitmap.fillRect(0, m, w, h - m * 2, c1);
            bitmap.gradientFillRect(0, h - m, w, m, c1, c2, true);
            this._dimmerSprite.setFrame(0, 0, w, h);
        }
    };


    Window_StatusBase.prototype.drawActorStatus = function(actor, rect) {
        const x = rect.x;
        const y = rect.y;
        const width = rect.width;
        const bottom = y + rect.height;
        const lineHeight = this.lineHeight();
        this.drawActorName(actor, x, y, width);
        this.drawActorLevel(actor, x + width - 120, y + lineHeight, width);
        this.drawActorClass(actor, x, bottom - lineHeight * 4, width);
        this.placeBasicGauges(actor, x + 72, bottom - lineHeight * 3, width);
        this.drawActorIcons(actor, x, bottom - lineHeight * 1, width);
    };


    //-----------------------------------------------------------------------------
    // Scene_Battle
    //-----------------------------------------------------------------------------

	Sprite_Actor.prototype.setActorHome = function(index) {
        this.setHome(SV_ACTOR_BASE_X + index * 32, SV_ACTOR_BASE_Y + index * 48);
    };

    Sprite_Actor.prototype.retreat = function() {
        this.startMove(600, 0, 30);
    };


    Scene_Battle.prototype.statusWindowRect = function() {
        const extra = 10;
        const ww = Graphics.boxWidth - BATTLE_COMMAND_WINDOW_WIDTH;
        const wh = this.windowAreaHeight() + extra;
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = Graphics.boxHeight - wh + extra - 4;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Battle.prototype.actorCommandWindowRect = function() {
        const ww = BATTLE_COMMAND_WINDOW_WIDTH;
        const wh = this.windowAreaHeight();
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Battle.prototype.partyCommandWindowRect = function() {
        const ww = BATTLE_COMMAND_WINDOW_WIDTH;
        const wh = this.windowAreaHeight();
        const wx = this.isRightInputMode() ? Graphics.boxWidth - ww : 0;
        const wy = Graphics.boxHeight - wh;
        return new Rectangle(wx, wy, ww, wh);
    };


    const _Window_BattleStatus_prototype_basicGaugesX = Window_BattleStatus.prototype.basicGaugesX;
    Window_BattleStatus.prototype.basicGaugesX = function(rect) {
        return _Window_BattleStatus_prototype_basicGaugesX.call(this, rect) + GAUGE_OFFSET_X;
    };


	//-----------------------------------------------------------------------------
    // Scene_Menu
    //-----------------------------------------------------------------------------

	Window_MenuStatus.prototype.drawItemStatus = function(index) {
        const actor = this.actor(index);
		const statusRect = this.itemRectWithPadding(index);
		if (DRAW_MENU_STATUS_BACKGROUND) {
			const backgroundRect = this.itemRectWithPadding(index);
			backgroundRect.height = this.lineHeight() * 4;
			backgroundRect.y += statusRect.height - backgroundRect.height;
			this.drawGradientGrayRect(backgroundRect);
		}
        this.drawActorStatus(actor, statusRect);
    };

    Window_MenuStatus.prototype.drawItemImage = function(index) {
        const actor = this.actor(index);
        const rect = this.itemRectWithPadding(index);
        const w = rect.width;
        const h = rect.height;
        this.changePaintOpacity(actor.isBattleMember());
        this.drawActorPicture(actor, rect.x, rect.y, w, h, true, true);
        this.changePaintOpacity(true);
    };


    //-----------------------------------------------------------------------------
    // Scene_Skill
    //-----------------------------------------------------------------------------

    Scene_Skill.prototype.mainCommandWidth = function() {
        return SKILL_COMMAND_WINDOW_WIDTH;
    };

    Scene_Skill.prototype.helpWindowRect = function() {
        const wx = this.mainCommandWidth();
        const wy = this.helpAreaTop();
        const ww = Graphics.boxWidth - wx;
        const wh = this.helpAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Skill.prototype.skillTypeWindowRect = function() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(3, true);
        const wx = 0;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Skill.prototype.statusWindowRect = function() {
        const typeWindow = this._skillTypeWindow;
        const typeWindowHeight = typeWindow.height;
        const ww = this.mainCommandWidth();
        const wh = Graphics.boxHeight - this.buttonAreaHeight() - typeWindowHeight;
        const wx = this.isRightInputMode() ? 0 : Graphics.boxWidth - ww;
        const wy = this._skillTypeWindow.y + typeWindowHeight;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Skill.prototype.itemWindowRect = function() {
        const wx = this.mainCommandWidth();
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - wx;
        const wh = this.mainAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    };


    Window_SkillStatus.prototype.refresh = function() {
        Window_StatusBase.prototype.refresh.call(this);
        const actor = this._actor;
        if (actor) {
            const w = this.innerWidth;
            const h = this.innerHeight;
            const statusRect = new Rectangle(0, 0, w, h);
            this.drawActorPicture(actor, 0, 0, w, h, true, true);
			if (DRAW_SKILL_STATUS_BACKGROUND) {
				const bh = this.lineHeight() * 4;
				const backgroundRect = new Rectangle(0, h - bh, w, bh);
				this.drawGradientGrayRect(backgroundRect);
			}
            this.drawActorStatus(actor, statusRect);
        }
    };


    //-----------------------------------------------------------------------------
    // Scene_Equip
    //-----------------------------------------------------------------------------

    Scene_Equip.prototype.statusWidth = function() {
        return STATUS_WINDOW_WIDTH;
    };

    Scene_Equip.prototype.helpWindowRect = function() {
        const wx = this.statusWidth();
        const wy = this.helpAreaTop();
        const ww = Graphics.boxWidth - wx;
        const wh = this.helpAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Equip.prototype.statusWindowRect = function() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = this.statusWidth();
        const wh = Graphics.boxHeight - this.buttonAreaHeight();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Equip.prototype.slotWindowRect = function() {
        const commandWindowRect = this.commandWindowRect();
        const wx = this.statusWidth();
        const wy = commandWindowRect.y + commandWindowRect.height;
        const ww = SLOT_WINDOW_WIDTH;
        const wh = this.mainAreaHeight() - commandWindowRect.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Equip.prototype.itemWindowRect = function() {
        const rect = this.slotWindowRect();
        rect.x += rect.width;
        rect.width = Graphics.boxWidth - this.statusWidth() - SLOT_WINDOW_WIDTH;
        return rect;
    };

    const _Scene_Equip_prototype_createItemWindow = Scene_Equip.prototype.createItemWindow;
    Scene_Equip.prototype.createItemWindow = function() {
        _Scene_Equip_prototype_createItemWindow.call(this);
        this._itemWindow.setSlotId(-1);
        this._itemWindow.show();
    };

    Scene_Equip.prototype.onSlotOk = function() {
        this._itemWindow.show();
        this._itemWindow.activate();
        this._itemWindow.forceSelect(0);
    };

    Scene_Equip.prototype.hideItemWindow = function() {
        this._slotWindow.activate();
        this._itemWindow.deselect();
    };


    Window_EquipStatus.prototype.refresh = function() {
        this.contents.clear();
        const actor = this._actor;
        if (actor) {
            const nameRect = this.itemLineRect(0);
            this.drawActorPicture(actor, 0, 0, this.innerWidth, this.innerHeight, true, true);
            this.drawActorName(actor, nameRect.x, 0, nameRect.width);
			if (DRAW_EQUIP_STATUS_BACKGROUND) {
				const iw = this.innerWidth;
				const ih = this.innerHeight;
				const bh = this.lineHeight() * 6;
				const backgroundRect = new Rectangle(0, ih - bh, iw, bh);
				this.drawGradientGrayRect(backgroundRect);
			}
            this.drawAllParams();
        }
    };
    
    Window_EquipStatus.prototype.paramY = function(index) {
		const lh = this.lineHeight();
        return this.innerHeight - lh * 6 + lh * index;
    };


    //-----------------------------------------------------------------------------
    // Scene_Status
    //-----------------------------------------------------------------------------

    Scene_Status.prototype.profileWindowRect = function() {
        const ww = Graphics.boxWidth - this.statusParamsWidth();
        const wh = this.profileHeight();
        const wx = 0;
        const wy = this.mainAreaBottom() - wh;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Status.prototype.statusWindowRect = function() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth - this.statusParamsWidth();
        const wh = Graphics.boxHeight - this.buttonAreaHeight() - this.profileHeight();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Status.prototype.statusParamsWindowRect = function() {
        const ww = this.statusParamsWidth();
        const wh = this.statusParamsHeight();
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Status.prototype.statusEquipWindowRect = function() {
        const ww = this.statusParamsWidth();
        const wh = Graphics.boxHeight - this.buttonAreaHeight() - this.statusParamsHeight();
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop() + this.statusParamsHeight();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Status.prototype.statusParamsWidth = function() {
        return STATUS_PARAMS_WINDOW_WIDTH;
    };

    Scene_Status.prototype.statusParamsHeight = function() {
        return this.calcWindowHeight(6, false);
    };

    Scene_Status.prototype.profileHeight = function() {
        return this.calcWindowHeight(2, false);
    };


    Window_Status.prototype.drawBlock2 = function() {
        const actor = this._actor;
		const iw = this.innerWidth;
		const ih = this.innerHeight;
        const x = Math.floor(iw / 2);
        const y = this.block2Y();
        this.drawActorPicture(actor, x, 0, iw, ih, true, true);
		if (DRAW_STATUS_INFO_BACKGROUND) {
			const bw = 278 + INFO_OFFSET_X;
			const bh = ih - y;
			const backgroundRect = new Rectangle(0, y, bw, bh);
			this.drawGradientGrayRect(backgroundRect);
		}
        this.drawBasicInfo(INFO_OFFSET_X, y);
        this.drawExpInfo(INFO_OFFSET_X, y + EXP_OFFSET_Y);
    };


	Window_StatusParams.prototype.drawItem = function(index) {
		const rect = this.itemLineRect(index);
		const paramId = index + 2;
		const name = TextManager.param(paramId);
		const value = this._actor.param(paramId);
		this.changeTextColor(ColorManager.systemColor());
		this.drawText(name, rect.x, rect.y, 160);
		this.resetTextColor();
		this.drawText(value, rect.x + 160, rect.y, rect.width - 160 - PARAM_OFFSET_X, "right");
	};


})();
