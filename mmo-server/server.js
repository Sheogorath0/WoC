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
console.log("MZ MMORPG 10단계 (멀티 맵 세션 분리 서버) 구동 중...");
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
                    
                    // [기능 확장] 유저의 맵 ID도 함께 관리합니다. (기본값 1번 맵)
                    activePlayers[myUserId] = {
                        mapId: user.mapId || 1, 
                        x: user.x,
                        y: user.y,
                        d: 2,
                        characterName: user.characterName,
                        characterIndex: user.characterIndex,
                        moveSpeed: 4
                    };

                    // 본인에게는 전체 목록을 우선 보냅니다 (클라이언트가 맵 필터링 처리)
                    ws.send(JSON.stringify({
                        type: 'LOGIN_SUCCESS',
                        id: myUserId,
                        ...activePlayers[myUserId],
                        existingPlayers: activePlayers
                    }));

                    // 다른 유저들에게 전송 (같은 맵에 있는 사람에게만 전달됨)
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
                // 실시간 위치 및 맵 ID 동기화
                activePlayers[myUserId].mapId = packet.mapId || 1;
                activePlayers[myUserId].x = packet.x;
                activePlayers[myUserId].y = packet.y;
                activePlayers[myUserId].d = packet.d;
                activePlayers[myUserId].moveSpeed = packet.moveSpeed;

                // [중요] 이동 패킷 방송
                broadcast(myUserId, {
                    type: 'UPDATE_POSITION',
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
            
            // 나갈 때 최종 맵 ID와 위치 저장
            delete require.cache[require.resolve('./userdata.js')];
            const userDatabase = require('./userdata.js');
            if (userDatabase[myUserId] && activePlayers[myUserId]) {
                userDatabase[myUserId].mapId = activePlayers[myUserId].mapId;
                userDatabase[myUserId].x = activePlayers[myUserId].x;
                userDatabase[myUserId].y = activePlayers[myUserId].y;
                saveUserData(userDatabase);
            }

            // 퇴장 패킷은 전체 맵의 모든 유저에게 전송하여 리스트에서 청소하게 함
            wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'REMOVE_PLAYER', id: myUserId }));
                }
            });

            delete activePlayers[myUserId];
        }
    });
});

// [자동 배치 세이브] 맵 ID 정보를 포함하여 5초 주기로 저장
setInterval(() => {
    if (Object.keys(activePlayers).length === 0) return;

    delete require.cache[require.resolve('./userdata.js')];
    const userDatabase = require('./userdata.js');

    let isChanged = false;
    for (const id in activePlayers) {
        if (userDatabase[id]) {
            userDatabase[id].mapId = activePlayers[id].mapId;
            userDatabase[id].x = activePlayers[id].x;
            userDatabase[id].y = activePlayers[id].y;
            isChanged = true;
        }
    }
    if (isChanged) saveUserData(userDatabase);
}, 5000);

// ===================================================================
// [핵심 업그레이드] 맵 기반 세션 라우팅 방송 함수
// 패킷을 보낸 사람(senderId)과 같은 mapId를 가진 클라이언트에게만 패킷을 보냅니다.
// ===================================================================
function broadcast(senderId, packetData) {
    const sender = activePlayers[senderId];
    if (!sender) return;

    wss.clients.forEach((client) => {
        // 소켓 연결이 살아있는 클라이언트들을 전수 조사
        if (client.readyState === 1) {
            // 주안점: 클라이언트들 중 서버의 activePlayers 명단에서 매칭되는 유저를 찾음
            for (const id in activePlayers) {
                // 본인은 제외하고, 같은 맵 ID를 가진 유저의 소켓을 찾아 패킷 전송
                if (id !== senderId && activePlayers[id].mapId === sender.mapId) {
                    client.send(JSON.stringify(packetData));
                }
            }
        }
    });
}