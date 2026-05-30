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
                        moveSpeed: 4
                    };

                    ws.send(JSON.stringify({
                        type: 'LOGIN_SUCCESS',
                        id: myUserId,
                        mapId: currentMapId,
                        x: currentX,
                        y: currentY,
                        characterName: user.characterName,
                        characterIndex: user.characterIndex,
                        existingPlayers: activePlayers
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
            // 5초마다 메모리(RAM)에 있는 mapId, x, y를 userdata.js 파일에 덮어씁니다.
            userDatabase[id].mapId = activePlayers[id].mapId;
            userDatabase[id].x = activePlayers[id].x;
            userDatabase[id].y = activePlayers[id].y;
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