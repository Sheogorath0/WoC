/*:
 * @target MZ
 * @plugindesc 멀티플레이어 실시간 경매장 UI (무기 전용)
 * @author Visual Tutor
 *
 * @help
 * 실시간 멀티플레이어 경매장 시스템의 시각적 UI를 담당하는 플러그인입니다.
 * 통신 처리는 NetCoreMZ.js에서 전담하며 이 플러그인은 화면 표시만 담당합니다.
 * 
 * [사용법]
 * 마을의 경매장 NPC 이벤트에 '스크립트'로 다음을 입력하세요.
 * SceneManager.push(Scene_Auction);
 */

(() => {
    'use strict';

    // ===================================================================
    // 1. Scene_Auction
    // ===================================================================
    function Scene_Auction() {
        this.initialize(...arguments);
    }
    Scene_Auction.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Auction.prototype.constructor = Scene_Auction;

    Scene_Auction.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
        // 씬 시작 시 서버에 최신 경매 리스트를 요청합니다.
        if (window.$gameAuction && window.$gameAuction.sendPacket) {
            window.$gameAuction.sendPacket({ type: 'AUCTION_LIST_REQUEST' });
        }
    };

    Scene_Auction.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createCommandWindow();
        this.createDummyWindow();
        this.createListWindow();
        this.createSellWindow();
        this.createPriceWindow();
        this.createGoldWindow();
    };

    Scene_Auction.prototype.createCommandWindow = function() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_AuctionCommand(rect);
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setHandler('buy', this.commandBuy.bind(this));
        this._commandWindow.setHandler('sell', this.commandSell.bind(this));
        this._commandWindow.setHandler('claim', this.commandClaim.bind(this));
        this._commandWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    };

    Scene_Auction.prototype.commandWindowRect = function() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = 300;
        const wh = this.calcWindowHeight(4, true);
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Auction.prototype.createDummyWindow = function() {
        const rect = this.dummyWindowRect();
        this._dummyWindow = new Window_Base(rect);
        this.addWindow(this._dummyWindow);
    };

    Scene_Auction.prototype.dummyWindowRect = function() {
        const wx = 0;
        const wy = this._commandWindow.y + this._commandWindow.height;
        const ww = Graphics.boxWidth;
        const wh = Graphics.boxHeight - wy;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Auction.prototype.createListWindow = function() {
        const rect = this.dummyWindowRect();
        this._listWindow = new Window_AuctionList(rect);
        this._listWindow.setHelpWindow(this._helpWindow);
        this._listWindow.hide();
        this._listWindow.setHandler('ok', this.onListOk.bind(this));
        this._listWindow.setHandler('cancel', this.onListCancel.bind(this));
        this.addWindow(this._listWindow);
    };

    Scene_Auction.prototype.createSellWindow = function() {
        const rect = this.dummyWindowRect();
        this._sellWindow = new Window_AuctionSell(rect);
        this._sellWindow.setHelpWindow(this._helpWindow);
        this._sellWindow.hide();
        this._sellWindow.setHandler('ok', this.onSellOk.bind(this));
        this._sellWindow.setHandler('cancel', this.onSellCancel.bind(this));
        this.addWindow(this._sellWindow);
    };

    Scene_Auction.prototype.createPriceWindow = function() {
        const rect = this.priceWindowRect();
        this._priceWindow = new Window_AuctionPrice(rect);
        this._priceWindow.hide();
        this._priceWindow.setHandler('ok', this.onPriceOk.bind(this));
        this._priceWindow.setHandler('cancel', this.onPriceCancel.bind(this));
        this.addWindow(this._priceWindow);
    };

    Scene_Auction.prototype.priceWindowRect = function() {
        const ww = 400;
        const wh = this.calcWindowHeight(4, false);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Auction.prototype.createGoldWindow = function() {
        const rect = this.goldWindowRect();
        this._goldWindow = new Window_Gold(rect);
        this.addWindow(this._goldWindow);
    };

    Scene_Auction.prototype.goldWindowRect = function() {
        const ww = this.mainCommandWidth();
        const wh = this.calcWindowHeight(1, true);
        const wx = Graphics.boxWidth - ww;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Auction.prototype.commandBuy = function() {
        this._dummyWindow.hide();
        this._listWindow.refresh();
        this._listWindow.show();
        this._listWindow.activate();
    };

    Scene_Auction.prototype.commandSell = function() {
        this._dummyWindow.hide();
        this._sellWindow.refresh();
        this._sellWindow.show();
        this._sellWindow.activate();
    };

    Scene_Auction.prototype.commandClaim = function() {
        if (window.$gameAuction && window.$gameAuction.pendingIncome > 0) {
            window.$gameAuction.sendPacket({ type: 'AUCTION_CLAIM' });
        } else {
            SoundManager.playBuzzer();
        }
        this._commandWindow.activate();
    };

    Scene_Auction.prototype.onListOk = function() {
        const auctionItem = this._listWindow.item();
        if (auctionItem) {
            if ($gameParty.gold() >= auctionItem.price) {
                window.$gameAuction.sendPacket({ type: 'AUCTION_BUY', auctionId: auctionItem.id });
                this._listWindow.activate(); // 응답은 비동기로 처리됨
            } else {
                SoundManager.playBuzzer();
                this._listWindow.activate();
            }
        }
    };

    Scene_Auction.prototype.onListCancel = function() {
        this._listWindow.hide();
        this._dummyWindow.show();
        this._commandWindow.activate();
    };

    Scene_Auction.prototype.onSellOk = function() {
        this._itemToSell = this._sellWindow.item();
        this._sellWindow.deactivate();
        this._priceWindow.show();
        this._priceWindow.activate();
    };

    Scene_Auction.prototype.onSellCancel = function() {
        this._sellWindow.hide();
        this._dummyWindow.show();
        this._commandWindow.activate();
    };

    Scene_Auction.prototype.onPriceOk = function() {
        const price = this._priceWindow.price();
        if (price > 0 && this._itemToSell) {
            window.$gameAuction.sendPacket({ 
                type: 'AUCTION_REGISTER', 
                itemId: this._itemToSell.id, 
                price: price 
            });
            this._priceWindow.hide();
            this._sellWindow.refresh();
            this._sellWindow.activate();
        } else {
            SoundManager.playBuzzer();
            this._priceWindow.activate();
        }
    };

    Scene_Auction.prototype.onPriceCancel = function() {
        this._priceWindow.hide();
        this._sellWindow.activate();
    };

    Scene_Auction.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        // 서버에서 패킷을 받아 리스트가 갱신되었을 경우 창 리프레시
        if (this._listWindow.active) {
            if (this._lastAuctionList !== window.$gameAuction.list) {
                this._lastAuctionList = window.$gameAuction.list;
                this._listWindow.refresh();
            }
        }
        if (this._commandWindow.active) {
            this._commandWindow.refresh();
            this._goldWindow.refresh();
        }
    };

    // ===================================================================
    // 2. Window_AuctionCommand
    // ===================================================================
    function Window_AuctionCommand() {
        this.initialize(...arguments);
    }
    Window_AuctionCommand.prototype = Object.create(Window_Command.prototype);
    Window_AuctionCommand.prototype.constructor = Window_AuctionCommand;

    Window_AuctionCommand.prototype.makeCommandList = function() {
        this.addCommand("무기 구매하기", 'buy');
        this.addCommand("내 무기 판매하기", 'sell');
        const income = window.$gameAuction ? window.$gameAuction.pendingIncome : 0;
        this.addCommand("판매 대금 수령 (" + income + " G)", 'claim', income > 0);
        this.addCommand("나가기", 'cancel');
    };

    Window_AuctionCommand.prototype.updateHelp = function() {
        switch (this.currentSymbol()) {
            case 'buy': this._helpWindow.setText("경매장에 등록된 무기를 구매합니다."); break;
            case 'sell': this._helpWindow.setText("내 인벤토리의 무기를 경매장에 등록합니다."); break;
            case 'claim': this._helpWindow.setText("판매 완료된 무기의 대금을 수령합니다."); break;
            case 'cancel': this._helpWindow.setText("경매장을 나갑니다."); break;
        }
    };

    // ===================================================================
    // 3. Window_AuctionList
    // ===================================================================
    function Window_AuctionList() {
        this.initialize(...arguments);
    }
    Window_AuctionList.prototype = Object.create(Window_Selectable.prototype);
    Window_AuctionList.prototype.constructor = Window_AuctionList;

    Window_AuctionList.prototype.initialize = function(rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._data = [];
        this.refresh();
    };

    Window_AuctionList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_AuctionList.prototype.item = function() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    };

    Window_AuctionList.prototype.makeItemList = function() {
        this._data = window.$gameAuction ? window.$gameAuction.list : [];
    };

    Window_AuctionList.prototype.drawItem = function(index) {
        const item = this._data[index];
        if (item) {
            const rect = this.itemLineRect(index);
            const weaponData = $dataWeapons[item.itemId];
            if (weaponData) {
                this.drawItemName(weaponData, rect.x, rect.y, rect.width - 150);
                this.drawText(item.price + " G", rect.x + rect.width - 150, rect.y, 150, 'right');
            }
        }
    };

    Window_AuctionList.prototype.refresh = function() {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    Window_AuctionList.prototype.updateHelp = function() {
        const item = this.item();
        if (item) {
            this._helpWindow.setItem($dataWeapons[item.itemId]);
        } else {
            this._helpWindow.clear();
        }
    };

    // ===================================================================
    // 4. Window_AuctionSell
    // ===================================================================
    function Window_AuctionSell() {
        this.initialize(...arguments);
    }
    Window_AuctionSell.prototype = Object.create(Window_ItemList.prototype);
    Window_AuctionSell.prototype.constructor = Window_AuctionSell;

    Window_AuctionSell.prototype.includes = function(item) {
        // 무기만 등록 가능하도록 필터링
        return DataManager.isWeapon(item);
    };

    Window_AuctionSell.prototype.isEnabled = function(item) {
        return item !== null;
    };

    // ===================================================================
    // 5. Window_AuctionPrice
    // ===================================================================
    function Window_AuctionPrice() {
        this.initialize(...arguments);
    }
    Window_AuctionPrice.prototype = Object.create(Window_Command.prototype);
    Window_AuctionPrice.prototype.constructor = Window_AuctionPrice;

    Window_AuctionPrice.prototype.initialize = function(rect) {
        this._price = 100;
        Window_Command.prototype.initialize.call(this, rect);
    };

    Window_AuctionPrice.prototype.makeCommandList = function() {
        this.addCommand("판매 금액 설정 완료", 'ok');
    };

    Window_AuctionPrice.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        this.drawText("판매 가격: " + this._price + " G", rect.x, rect.y, rect.width, 'center');
    };

    Window_AuctionPrice.prototype.update = function() {
        Window_Command.prototype.update.call(this);
        if (this.active) {
            let changed = false;
            if (Input.isRepeated('right')) { this._price += 100; changed = true; }
            if (Input.isRepeated('left')) { this._price = Math.max(0, this._price - 100); changed = true; }
            if (Input.isRepeated('up')) { this._price += 1000; changed = true; }
            if (Input.isRepeated('down')) { this._price = Math.max(0, this._price - 1000); changed = true; }
            if (changed) {
                SoundManager.playCursor();
                this.refresh();
            }
        }
    };

    Window_AuctionPrice.prototype.price = function() {
        return this._price;
    };

})();
