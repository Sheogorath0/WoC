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
        this.createAmountWindow();
        this.createBuyAmountWindow();
        this.createCategoryWindow();
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

    Scene_Auction.prototype.createAmountWindow = function() {
        const rect = this.priceWindowRect(); // 동일한 크기 및 렉트 사용
        this._amountWindow = new Window_AuctionAmount(rect);
        this._amountWindow.hide();
        this._amountWindow.setHandler('ok', this.onAmountOk.bind(this));
        this._amountWindow.setHandler('cancel', this.onAmountCancel.bind(this));
        this.addWindow(this._amountWindow);
    };

    Scene_Auction.prototype.createBuyAmountWindow = function() {
        const rect = this.priceWindowRect(); // 동일한 크기 및 렉트 사용
        this._buyAmountWindow = new Window_AuctionBuyAmount(rect);
        this._buyAmountWindow.hide();
        this._buyAmountWindow.setHandler('ok', this.onBuyAmountOk.bind(this));
        this._buyAmountWindow.setHandler('cancel', this.onBuyAmountCancel.bind(this));
        this.addWindow(this._buyAmountWindow);
    };

    Scene_Auction.prototype.createCategoryWindow = function() {
        const rect = this.commandWindowRect(); // 메인 커맨드 창과 동일한 영역에 오버레이
        this._categoryWindow = new Window_AuctionCategory(rect);
        this._categoryWindow.hide();
        this._categoryWindow.setHandler('weapon', this.onCategorySelect.bind(this, 'weapon'));
        this._categoryWindow.setHandler('armor', this.onCategorySelect.bind(this, 'armor'));
        this._categoryWindow.setHandler('item', this.onCategorySelect.bind(this, 'item'));
        this._categoryWindow.setHandler('cancel', this.onCategoryCancel.bind(this));
        this.addWindow(this._categoryWindow);
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
        this._auctionMode = 'buy';
        this._commandWindow.deactivate();
        this._commandWindow.hide();
        this._categoryWindow.show();
        this._categoryWindow.activate();
    };

    Scene_Auction.prototype.commandSell = function() {
        this._auctionMode = 'sell';
        this._commandWindow.deactivate();
        this._commandWindow.hide();
        this._categoryWindow.show();
        this._categoryWindow.activate();
    };

    Scene_Auction.prototype.onCategorySelect = function(category) {
        this._selectedCategory = category;
        this._categoryWindow.deactivate();
        this._categoryWindow.hide();
        
        this._dummyWindow.hide();
        
        if (this._auctionMode === 'buy') {
            this._listWindow.setCategory(category);
            this._listWindow.show();
            this._listWindow.activate();
            this._listWindow.select(0);
        } else {
            this._sellWindow.setCategory(category);
            this._sellWindow.show();
            this._sellWindow.activate();
            this._sellWindow.select(0);
        }
    };

    Scene_Auction.prototype.onCategoryCancel = function() {
        this._categoryWindow.deactivate();
        this._categoryWindow.hide();
        this._dummyWindow.show();
        this._commandWindow.show();
        this._commandWindow.activate();
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
            // 소지 금액이 개당 최소 가격 이상인지 우선 검증
            if ($gameParty.gold() >= auctionItem.price) {
                if (auctionItem.quantity >= 2) {
                    this._listWindow.deactivate();
                    this._buyAmountWindow.setMaxAmount(auctionItem.quantity);
                    this._buyAmountWindow.refresh();
                    this._buyAmountWindow.show();
                    this._buyAmountWindow.activate();
                } else {
                    // 수량이 1개인 경우 즉시 구매 패킷 발송
                    window.$gameAuction.sendPacket({ 
                        type: 'AUCTION_BUY', 
                        auctionId: auctionItem.id, 
                        buyQuantity: 1 
                    });
                    this._listWindow.activate();
                }
            } else {
                SoundManager.playBuzzer();
                this._listWindow.activate();
            }
        }
    };

    Scene_Auction.prototype.onBuyAmountOk = function() {
        const auctionItem = this._listWindow.item();
        const buyQuantity = this._buyAmountWindow.amount();
        if (auctionItem && buyQuantity > 0) {
            const totalPrice = auctionItem.price * buyQuantity;
            if ($gameParty.gold() >= totalPrice) {
                window.$gameAuction.sendPacket({ 
                    type: 'AUCTION_BUY', 
                    auctionId: auctionItem.id, 
                    buyQuantity: buyQuantity 
                });
                this._buyAmountWindow.hide();
                this._listWindow.activate();
            } else {
                SoundManager.playBuzzer();
                this._buyAmountWindow.activate();
            }
        } else {
            SoundManager.playBuzzer();
            this._buyAmountWindow.activate();
        }
    };

    Scene_Auction.prototype.onBuyAmountCancel = function() {
        this._buyAmountWindow.hide();
        this._listWindow.activate();
    };

    Scene_Auction.prototype.onListCancel = function() {
        this._listWindow.hide();
        this._categoryWindow.show();
        this._categoryWindow.activate();
    };

    Scene_Auction.prototype.onSellOk = function() {
        this._itemToSell = this._sellWindow.item();
        if (this._itemToSell) {
            this._sellWindow.deactivate();
            this._priceWindow.show();
            this._priceWindow.activate();
        } else {
            SoundManager.playBuzzer();
            this._sellWindow.activate();
        }
    };

    Scene_Auction.prototype.onSellCancel = function() {
        this._sellWindow.hide();
        this._categoryWindow.show();
        this._categoryWindow.activate();
    };

    Scene_Auction.prototype.onPriceOk = function() {
        const price = this._priceWindow.price();
        if (price > 0 && this._itemToSell) {
            this._priceWindow.hide();
            // 수량 입력창 초기화 및 최댓값 설정
            const maxAmount = $gameParty.numItems(this._itemToSell);
            this._amountWindow.setMaxAmount(maxAmount);
            this._amountWindow.refresh();
            this._amountWindow.show();
            this._amountWindow.activate();
        } else {
            SoundManager.playBuzzer();
            this._priceWindow.activate();
        }
    };

    Scene_Auction.prototype.onPriceCancel = function() {
        this._priceWindow.hide();
        this._sellWindow.activate();
    };

    Scene_Auction.prototype.onAmountOk = function() {
        const price = this._priceWindow.price();
        const quantity = this._amountWindow.amount();
        if (quantity > 0 && this._itemToSell) {
            window.$gameAuction.sendPacket({ 
                type: 'AUCTION_REGISTER', 
                itemId: this._itemToSell.id, 
                itemType: this._selectedCategory,
                price: price,
                quantity: quantity
            });
            this._amountWindow.hide();
            this._sellWindow.refresh();
            this._sellWindow.activate();
        } else {
            SoundManager.playBuzzer();
            this._amountWindow.activate();
        }
    };

    Scene_Auction.prototype.onAmountCancel = function() {
        this._amountWindow.hide();
        this._priceWindow.show();
        this._priceWindow.activate();
    };

    Scene_Auction.prototype.refreshSellWindow = function() {
        if (this._sellWindow) {
            this._sellWindow.refresh();
        }
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
        // 골드 창은 비동기 패킷 수신(구매/대금 수령 등) 시 즉각 반영되도록 프레임마다 항상 갱신합니다.
        if (this._goldWindow) {
            this._goldWindow.refresh();
        }
        if (this._commandWindow.active) {
            this._commandWindow.refresh();
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
        this._category = 'weapon'; // 기본 분류
        this._data = [];
        this.refresh();
    };

    Window_AuctionList.prototype.setCategory = function(category) {
        this._category = category;
        this.refresh();
    };

    Window_AuctionList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_AuctionList.prototype.item = function() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    };

    Window_AuctionList.prototype.isCurrentItemEnabled = function() {
        return !!this.item();
    };

    Window_AuctionList.prototype.makeItemList = function() {
        const allList = window.$gameAuction ? window.$gameAuction.list : [];
        // 카테고리가 일치하는 물품만 필터링
        this._data = allList.filter(item => (item.itemType || 'weapon') === this._category);
    };

    Window_AuctionList.prototype.drawItem = function(index) {
        const item = this._data[index];
        if (item) {
            const rect = this.itemLineRect(index);
            
            // 카테고리에 맞는 데이터베이스 데이터 참조
            let db = $dataWeapons;
            if (this._category === 'armor') db = $dataArmors;
            if (this._category === 'item') db = $dataItems;
            
            const itemData = db[item.itemId];
            if (itemData) {
                const w1 = Math.floor(rect.width * 0.35);
                const w2 = Math.floor(rect.width * 0.25);
                const w3 = Math.floor(rect.width * 0.20);
                const w4 = Math.floor(rect.width * 0.20);
                
                // 1. 아이템 이름 및 아이콘
                this.drawItemName(itemData, rect.x, rect.y, w1);
                
                // 2. 판매자 ID
                this.changeTextColor(ColorManager.systemColor());
                this.drawText("판매자: " + item.sellerId, rect.x + w1, rect.y, w2, 'left');
                
                // 3. 수량
                this.changeTextColor(ColorManager.normalColor());
                this.drawText(item.quantity + " 개", rect.x + w1 + w2, rect.y, w3, 'center');
                
                // 4. 가격
                this.changeTextColor("#ffcc00");
                this.drawText(item.price + " G", rect.x + w1 + w2 + w3, rect.y, w4, 'right');
                
                this.changeTextColor(ColorManager.normalColor());
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
            let db = $dataWeapons;
            if (this._category === 'armor') db = $dataArmors;
            if (this._category === 'item') db = $dataItems;
            this._helpWindow.setItem(db[item.itemId]);
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

    Window_AuctionSell.prototype.initialize = function(rect) {
        Window_ItemList.prototype.initialize.call(this, rect);
        this._category = 'weapon';
    };

    Window_AuctionSell.prototype.setCategory = function(category) {
        this._category = category;
        this.refresh();
    };

    Window_AuctionSell.prototype.includes = function(item) {
        if (!item) return false;
        // 카테고리에 맞춰 소지 아이템 필터링
        if (this._category === 'weapon') return DataManager.isWeapon(item);
        if (this._category === 'armor') return DataManager.isArmor(item);
        if (this._category === 'item') return DataManager.isItem(item) && !DataManager.isWeapon(item) && !DataManager.isArmor(item);
        return false;
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

    // ===================================================================
    // 6. Window_AuctionAmount (신규)
    // ===================================================================
    function Window_AuctionAmount() {
        this.initialize(...arguments);
    }
    Window_AuctionAmount.prototype = Object.create(Window_Command.prototype);
    Window_AuctionAmount.prototype.constructor = Window_AuctionAmount;

    Window_AuctionAmount.prototype.initialize = function(rect) {
        this._amount = 1;
        this._maxAmount = 1;
        Window_Command.prototype.initialize.call(this, rect);
    };

    Window_AuctionAmount.prototype.setMaxAmount = function(max) {
        this._maxAmount = Math.max(1, max);
        this._amount = 1; // 띄울 때 항상 1로 초기화
    };

    Window_AuctionAmount.prototype.makeCommandList = function() {
        this.addCommand("판매 수량 설정 완료", 'ok');
    };

    Window_AuctionAmount.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        this.drawText("등록 수량: " + this._amount + " / " + this._maxAmount + " 개", rect.x, rect.y, rect.width, 'center');
    };

    Window_AuctionAmount.prototype.update = function() {
        Window_Command.prototype.update.call(this);
        if (this.active) {
            let changed = false;
            if (Input.isRepeated('right')) { this._amount = Math.min(this._maxAmount, this._amount + 1); changed = true; }
            if (Input.isRepeated('left')) { this._amount = Math.max(1, this._amount - 1); changed = true; }
            if (Input.isRepeated('up')) { this._amount = Math.min(this._maxAmount, this._amount + 10); changed = true; }
            if (Input.isRepeated('down')) { this._amount = Math.max(1, this._amount - 10); changed = true; }
            if (changed) {
                SoundManager.playCursor();
                this.refresh();
            }
        }
    };

    Window_AuctionAmount.prototype.amount = function() {
        return this._amount;
    };

    // ===================================================================
    // 7. Window_AuctionBuyAmount (신규)
    // ===================================================================
    function Window_AuctionBuyAmount() {
        this.initialize(...arguments);
    }
    Window_AuctionBuyAmount.prototype = Object.create(Window_AuctionAmount.prototype);
    Window_AuctionBuyAmount.prototype.constructor = Window_AuctionBuyAmount;

    Window_AuctionBuyAmount.prototype.makeCommandList = function() {
        this.addCommand("구매 수량 설정 완료", 'ok');
    };

    Window_AuctionBuyAmount.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        this.drawText("구매 수량: " + this._amount + " / " + this._maxAmount + " 개", rect.x, rect.y, rect.width, 'center');
    };

    // ===================================================================
    // 8. Window_AuctionCategory (신규)
    // ===================================================================
    function Window_AuctionCategory() {
        this.initialize(...arguments);
    }
    Window_AuctionCategory.prototype = Object.create(Window_Command.prototype);
    Window_AuctionCategory.prototype.constructor = Window_AuctionCategory;

    Window_AuctionCategory.prototype.makeCommandList = function() {
        this.addCommand("무기", 'weapon');
        this.addCommand("방어구", 'armor');
        this.addCommand("일반 아이템", 'item');
        this.addCommand("이전으로", 'cancel');
    };

    Window_AuctionCategory.prototype.updateHelp = function() {
        if (this._helpWindow) {
            switch (this.currentSymbol()) {
                case 'weapon': this._helpWindow.setText("무기 카테고리의 아이템들을 봅니다."); break;
                case 'armor': this._helpWindow.setText("방어구 카테고리의 아이템들을 봅니다."); break;
                case 'item': this._helpWindow.setText("일반 소비/기타 아이템들을 봅니다."); break;
                case 'cancel': this._helpWindow.setText("이전 화면으로 돌아갑니다."); break;
            }
        }
    };

    // 씬을 외부에서 호출할 수 있도록 글로벌 네임스페이스에 노출합니다.
    window.Scene_Auction = Scene_Auction;

})();
