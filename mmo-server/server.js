// server.js
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const wss = new WebSocketServer({ port: 8080 });
const dbPath = path.join(__dirname, 'userdata.js');

function saveUserData(data) {
    try {
        const fileContent = `const userDatabase = ${JSON.stringify(data, null, 2)};\n\nmodule.exports = userDatabase;`;
        fs.writeFileSync(dbPath, fileContent, 'utf8');
    } catch (error) {
        console.error("데이터 파일 저장 중 오류 발생:", error);
    }
}

const activePlayers = {};
const globalSharedSwitches = {};
const globalSharedVariables = {};

// 경매장 전역 데이터베이스
const auctionDatabase = []; // { id, sellerId, itemId, price, timestamp } 구조의 리스트
const auctionPendingIncome = {}; // { userId: goldAmount } 구조
let auctionIdCounter = 1;

console.log("=========================================");
console.log("MZ MMORPG 14단계 (잔상 버그 완전 소멸 빌드) 구동 중...");
console.log("=========================================");

wss.on('connection', (ws) => {
    let myUserId = null;

    ws.on('message', (message) => {
        try {
            const packet = JSON.parse(message);

            if (packet.type === 'REQUEST_LOGIN') {
                const { id, password } = packet;

                delete require.cache[require.resolve('./userdata.js')];
                const userDatabase = require('./userdata.js');
                const user = userDatabase[id];

                if (user && user.password === password) {
                    if (activePlayers[id]) {
                        ws.send(JSON.stringify({ type: 'LOGIN_FAIL', message: '이미 접속 중인 계정입니다.' }));
                        return;
                    }

                    myUserId = id;
                    console.log(`[로그인] ${myUserId} 세션 생성`);

                    const currentMapId = user.mapId || 1;
                    const currentX = user.x !== undefined ? user.x : 5;
                    const currentY = user.y !== undefined ? user.y : 5;

                    activePlayers[myUserId] = {
                        mapId: currentMapId,
                        x: currentX,
                        y: currentY,
                        d: 2,
                        characterName: user.characterName,
                        characterIndex: user.characterIndex,
                        moveSpeed: 4,
                        inBattle: false,
                        switches: user.switches || {},
                        variables: user.variables || {},
                        gold: user.gold || 0,
                        weapons: user.weapons || {},
                        armors: user.armors || {},
                        items: user.items || {}
                    };

                    ws.send(JSON.stringify({
                        type: 'LOGIN_SUCCESS',
                        id: myUserId,
                        mapId: currentMapId,
                        x: currentX,
                        y: currentY,
                        characterName: user.characterName,
                        characterIndex: user.characterIndex,
                        existingPlayers: activePlayers,
                        switches: user.switches || {},
                        variables: user.variables || {},
                        sharedSwitches: globalSharedSwitches,
                        sharedVariables: globalSharedVariables,
                        gold: user.gold || 0,
                        weapons: user.weapons || {},
                        armors: user.armors || {},
                        items: user.items || {},
                        pendingIncome: auctionPendingIncome[myUserId] || 0
                    }));

                    // 입장 시 동일 맵 유저들에게 방송
                    broadcast(myUserId, {
                        type: 'NEW_PLAYER',
                        id: myUserId,
                        ...activePlayers[myUserId]
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'LOGIN_FAIL', message: '아이디/비밀번호 오류' }));
                }
            }
            else if (packet.type === 'MOVE' && myUserId) {
                // [기존 전송 로직 보완] 다른 유저들에게 퍼트리기 전, 
                // "이 패킷을 보낸 유저가 이전에 있던 이전 방 번호"를 잠시 기억해둡니다.
                const oldMapId = activePlayers[myUserId].mapId;
                const newMapId = packet.mapId || 1;

                // 서버 메모리에 새로운 좌표와 맵 ID를 갱신합니다.
                activePlayers[myUserId].mapId = newMapId;
                activePlayers[myUserId].x = packet.x;
                activePlayers[myUserId].y = packet.y;
                activePlayers[myUserId].d = packet.d;
                activePlayers[myUserId].moveSpeed = packet.moveSpeed;

                // [버그 수정] 클라이언트가 갱신해서 보낸 '새로운 외형 데이터'를 서버 메모리에도 반영해야 
                // 다른 플레이어들에게 제대로 전달(broadcast)됩니다.
                if (packet.characterName !== undefined) activePlayers[myUserId].characterName = packet.characterName;
                if (packet.characterIndex !== undefined) activePlayers[myUserId].characterIndex = packet.characterIndex;

                // 만약 유저가 포탈을 타고 "방을 이동하는 패킷"인 경우
                if (oldMapId !== newMapId) {
                    // 원래 있던 방(이전 맵)에 남아있는 사람들에게 
                    // "나 방 옮기니까 내 잔상 지워줘!"라고 선제 타겟 방송을 쏩니다.
                    broadcastToSpecificMap(myUserId, oldMapId, {
                        type: 'UPDATE_POSITION',
                        id: myUserId,
                        mapId: newMapId, // 새로 이사 간 맵 ID를 실어서 보냄으로써 클라이언트가 지우도록 유도
                        x: packet.x, y: packet.y, d: packet.d
                    });
                } else {
                    // 평범한 한 칸 이동일 때는 현재 방에 있는 유저들에게 정상 방송
                    broadcast(myUserId, {
                        type: 'UPDATE_POSITION',
                        id: myUserId,
                        ...activePlayers[myUserId]
                    });
                }
            }
            else if (packet.type === 'BATTLE_START' && myUserId) {
                if (activePlayers[myUserId]) {
                    activePlayers[myUserId].inBattle = true;
                    broadcast(myUserId, {
                        type: 'PLAYER_BATTLE_STATUS',
                        userId: myUserId,
                        isFighting: true
                    });
                }
            }
            else if (packet.type === 'BATTLE_END' && myUserId) {
                if (activePlayers[myUserId]) {
                    activePlayers[myUserId].inBattle = false;
                    broadcast(myUserId, {
                        type: 'PLAYER_BATTLE_STATUS',
                        userId: myUserId,
                        isFighting: false
                    });
                }
            }
            else if (packet.type === 'SYNC_SHARED_DATA' && myUserId) {
                if (packet.isSwitch) {
                    globalSharedSwitches[packet.id] = packet.value;
                } else {
                    globalSharedVariables[packet.id] = packet.value;
                }

                // 모든 클라이언트들에게 실시간 브로드캐스트
                wss.clients.forEach((client) => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({
                            type: 'SYNC_SHARED_DATA',
                            isSwitch: packet.isSwitch,
                            id: packet.id,
                            value: packet.value
                        }));
                    }
                });
            }
            else if (packet.type === 'SYNC_GOLD' && myUserId) {
                if (activePlayers[myUserId]) {
                    activePlayers[myUserId].gold = packet.gold;
                }
            }
            else if (packet.type === 'SYNC_INVENTORY' && myUserId) {
                if (activePlayers[myUserId]) {
                    activePlayers[myUserId].weapons = packet.weapons;
                    activePlayers[myUserId].armors = packet.armors;
                    activePlayers[myUserId].items = packet.items;
                }
            }
            else if (packet.type === 'AUCTION_LIST_REQUEST' && myUserId) {
                ws.send(JSON.stringify({
                    type: 'AUCTION_LIST_RESPONSE',
                    list: auctionDatabase,
                    pendingIncome: auctionPendingIncome[myUserId] || 0
                }));
            }
            else if (packet.type === 'AUCTION_REGISTER' && myUserId) {
                // 인벤토리 검증 (무기가 있는지)
                const itemId = packet.itemId;
                const price = packet.price;
                if (activePlayers[myUserId] && activePlayers[myUserId].weapons[itemId] > 0 && price > 0) {
                    activePlayers[myUserId].weapons[itemId]--;
                    
                    const newAuction = {
                        id: auctionIdCounter++,
                        sellerId: myUserId,
                        itemId: itemId,
                        price: price,
                        timestamp: Date.now()
                    };
                    auctionDatabase.push(newAuction);
                    
                    ws.send(JSON.stringify({ type: 'AUCTION_REGISTER_SUCCESS', itemId: itemId }));
                    
                    // 전체 유저에게 리스트 갱신 알림
                    wss.clients.forEach((client) => {
                        if (client.readyState === 1) {
                            client.send(JSON.stringify({ type: 'AUCTION_UPDATE', list: auctionDatabase }));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'AUCTION_FAIL', message: '무기가 없거나 가격이 올바르지 않습니다.' }));
                }
            }
            else if (packet.type === 'AUCTION_BUY' && myUserId) {
                const auctionId = packet.auctionId;
                const auctionIndex = auctionDatabase.findIndex(a => a.id === auctionId);
                
                if (auctionIndex !== -1) {
                    const auctionItem = auctionDatabase[auctionIndex];
                    if (activePlayers[myUserId] && activePlayers[myUserId].gold >= auctionItem.price) {
                        // 골드 차감 및 무기 지급
                        activePlayers[myUserId].gold -= auctionItem.price;
                        activePlayers[myUserId].weapons[auctionItem.itemId] = (activePlayers[myUserId].weapons[auctionItem.itemId] || 0) + 1;
                        
                        // 판매자 대금 보관
                        auctionPendingIncome[auctionItem.sellerId] = (auctionPendingIncome[auctionItem.sellerId] || 0) + auctionItem.price;
                        
                        // 리스트에서 제거
                        auctionDatabase.splice(auctionIndex, 1);
                        
                        ws.send(JSON.stringify({ type: 'AUCTION_BUY_SUCCESS', itemId: auctionItem.itemId, price: auctionItem.price }));
                        
                        // 판매자가 접속 중이면 즉시 알림
                        wss.clients.forEach((client) => {
                            if (client.readyState === 1) {
                                client.send(JSON.stringify({ type: 'AUCTION_UPDATE', list: auctionDatabase }));
                                // 판매자에게만 별도 알림 (선택적)
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'AUCTION_FAIL', message: '골드가 부족합니다.' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'AUCTION_FAIL', message: '이미 판매된 물품입니다.' }));
                }
            }
            else if (packet.type === 'AUCTION_CLAIM' && myUserId) {
                const income = auctionPendingIncome[myUserId] || 0;
                if (income > 0) {
                    if (activePlayers[myUserId]) {
                        activePlayers[myUserId].gold += income;
                        auctionPendingIncome[myUserId] = 0;
                        ws.send(JSON.stringify({ type: 'AUCTION_CLAIM_SUCCESS', amount: income }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'AUCTION_FAIL', message: '수령할 대금이 없습니다.' }));
                }
            }
            else if (packet.type === 'SYNC_PERSONAL_DATA' && myUserId) {
                if (activePlayers[myUserId]) {
                    if (packet.isSwitch) {
                        activePlayers[myUserId].switches[packet.id] = packet.value;
                    } else {
                        activePlayers[myUserId].variables[packet.id] = packet.value;
                    }
                }
            }
            else if (packet.type === 'MAP_CHANGED' && myUserId) {
                activePlayers[myUserId].mapId = packet.mapId;
                activePlayers[myUserId].x = packet.x;
                activePlayers[myUserId].y = packet.y;

                console.log(`[맵전환] ${myUserId} -> ${packet.mapId}번 맵 안착`);

                const targetsInNewMap = {};
                for (const id in activePlayers) {
                    if (id !== myUserId && activePlayers[id].mapId === packet.mapId) {
                        targetsInNewMap[id] = activePlayers[id];
                    }
                }

                ws.send(JSON.stringify({
                    type: 'REFRESH_MAP_PLAYERS',
                    existingPlayers: targetsInNewMap
                }));

                broadcast(myUserId, {
                    type: 'NEW_PLAYER',
                    id: myUserId,
                    ...activePlayers[myUserId]
                });
            }
        } catch (error) {
            console.error("패킷 에러:", error);
        }
    });

    ws.on('close', () => {
        if (myUserId) {
            console.log(`[종료] ${myUserId} 나감`);

            delete require.cache[require.resolve('./userdata.js')];
            const userDatabase = require('./userdata.js');
            if (userDatabase[myUserId] && activePlayers[myUserId]) {
                userDatabase[myUserId].mapId = activePlayers[myUserId].mapId;
                userDatabase[myUserId].x = activePlayers[myUserId].x;
                userDatabase[myUserId].y = activePlayers[myUserId].y;
                if (activePlayers[myUserId].characterName !== undefined) userDatabase[myUserId].characterName = activePlayers[myUserId].characterName;
                if (activePlayers[myUserId].characterIndex !== undefined) userDatabase[myUserId].characterIndex = activePlayers[myUserId].characterIndex;
                
                // 개인 스위치/변수 상태 파일 저장
                userDatabase[myUserId].switches = activePlayers[myUserId].switches || {};
                userDatabase[myUserId].variables = activePlayers[myUserId].variables || {};
                
                // 골드 및 인벤토리 최종 저장
                if (activePlayers[myUserId].gold !== undefined) userDatabase[myUserId].gold = activePlayers[myUserId].gold;
                if (activePlayers[myUserId].weapons) userDatabase[myUserId].weapons = activePlayers[myUserId].weapons;
                if (activePlayers[myUserId].armors) userDatabase[myUserId].armors = activePlayers[myUserId].armors;
                if (activePlayers[myUserId].items) userDatabase[myUserId].items = activePlayers[myUserId].items;
                
                saveUserData(userDatabase);
            }

            wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'REMOVE_PLAYER', id: myUserId }));
                }
            });

            delete activePlayers[myUserId];
        }
    });
});

// 자동 배치 세이브 (5초 주기)
// 현재 서버의 자동 세이브 로직 (원인 구간)
setInterval(() => {
    if (Object.keys(activePlayers).length === 0) return;

    delete require.cache[require.resolve('./userdata.js')];
    const userDatabase = require('./userdata.js');

    for (const id in activePlayers) {
        if (userDatabase[id]) {
            // 5초마다 메모리(RAM)에 있는 데이터를 userdata.js 파일에 덮어씁니다.
            userDatabase[id].mapId = activePlayers[id].mapId;
            userDatabase[id].x = activePlayers[id].x;
            userDatabase[id].y = activePlayers[id].y;
            if (activePlayers[id].characterName !== undefined) userDatabase[id].characterName = activePlayers[id].characterName;
            if (activePlayers[id].characterIndex !== undefined) userDatabase[id].characterIndex = activePlayers[id].characterIndex;
            
            // 자동 세이브 시 개인 스위치/변수 반영
            userDatabase[id].switches = activePlayers[id].switches || {};
            userDatabase[id].variables = activePlayers[id].variables || {};
            
            // 골드 및 인벤토리 자동 저장
            if (activePlayers[id].gold !== undefined) userDatabase[id].gold = activePlayers[id].gold;
            if (activePlayers[id].weapons) userDatabase[id].weapons = activePlayers[id].weapons;
            if (activePlayers[id].armors) userDatabase[id].armors = activePlayers[id].armors;
            if (activePlayers[id].items) userDatabase[id].items = activePlayers[id].items;
        }
    }
    saveUserData(userDatabase);
}, 5000);

// [기본] 내 현재 메모리상 맵 ID와 일치하는 유저들에게 방송하는 함수
function broadcast(senderId, packetData) {
    const sender = activePlayers[senderId];
    if (!sender) return;
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            for (const id in activePlayers) {
                if (id !== senderId && activePlayers[id].mapId === sender.mapId) {
                    client.send(JSON.stringify(packetData));
                }
            }
        }
    });
}

// [신규] 특정 지정 맵 번호(targetMapId)에 서 있는 유저들에게만 패킷을 강제 배달하는 타겟 방송 함수
function broadcastToSpecificMap(senderId, targetMapId, packetData) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            for (const id in activePlayers) {
                if (id !== senderId && activePlayers[id].mapId === targetMapId) {
                    client.send(JSON.stringify(packetData));
                }
            }
        }
    });
}