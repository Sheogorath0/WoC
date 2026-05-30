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

// 실시간 접속 유저들의 메모리 저장소
const activePlayers = {};

console.log("=========================================");
console.log("MZ MMORPG 8단계 (RAM 기반 고성능 배치 세이브 서버) 구동 중...");
console.log("=========================================");

wss.on('connection', (ws) => {
    let myUserId = null;

    ws.on('message', (message) => {
        try {
            const packet = JSON.parse(message);

            if (packet.type === 'REQUEST_LOGIN') {
                const { id, password } = packet;

                // 로그인할 때는 파일 캐시를 지우고 안전하게 로드
                delete require.cache[require.resolve('./userdata.js')];
                const userDatabase = require('./userdata.js');
                const user = userDatabase[id];

                if (user && user.password === password) {
                    if (activePlayers[id]) {
                        ws.send(JSON.stringify({ type: 'LOGIN_FAIL', message: '이미 접속 중인 계정입니다.' }));
                        return;
                    }

                    myUserId = id;
                    console.log(`[로그인] ${myUserId} (메모리 세션 생성)`);

                    activePlayers[myUserId] = {
                        x: user.x,
                        y: user.y,
                        d: 2,
                        characterName: user.characterName,
                        characterIndex: user.characterIndex,
                        moveSpeed: 4
                    };

                    ws.send(JSON.stringify({
                        type: 'LOGIN_SUCCESS',
                        id: myUserId,
                        ...activePlayers[myUserId],
                        existingPlayers: activePlayers
                    }));

                    broadcast({
                        type: 'NEW_PLAYER',
                        id: myUserId,
                        ...activePlayers[myUserId]
                    }, ws);
                } else {
                    ws.send(JSON.stringify({ type: 'LOGIN_FAIL', message: '아이디/비밀번호 오류' }));
                }
            }
            else if (packet.type === 'MOVE' && myUserId) {
                // [성능 향상의 핵심] 유저가 움직일 때는 파일(하드디스크)에 절대 쓰지 않고,
                // 오직 초고속 초정밀 RAM 메모리 데이터만 수정합니다. 부하가 전혀 없습니다.
                activePlayers[myUserId].x = packet.x;
                activePlayers[myUserId].y = packet.y;
                activePlayers[myUserId].d = packet.d;
                activePlayers[myUserId].moveSpeed = packet.moveSpeed;

                // 메모리 기반 정보를 다른 유저들에게 광속으로 공유
                broadcast({
                    type: 'UPDATE_POSITION',
                    id: myUserId,
                    ...activePlayers[myUserId]
                }, ws);
            }
        } catch (error) {
            console.error("패킷 에러:", error);
        }
    });

    ws.on('close', () => {
        if (myUserId) {
            // 유저가 나갈 때는 최종 위치를 파일 데이터베이스에 백업하고 나갑니다.
            delete require.cache[require.resolve('./userdata.js')];
            const userDatabase = require('./userdata.js');
            if (userDatabase[myUserId] && activePlayers[myUserId]) {
                userDatabase[myUserId].x = activePlayers[myUserId].x;
                userDatabase[myUserId].y = activePlayers[myUserId].y;
                saveUserData(userDatabase);
            }

            console.log(`[종료] ${myUserId} 세션 해제 완료`);
            delete activePlayers[myUserId];
            broadcast({ type: 'REMOVE_PLAYER', id: myUserId });
        }
    });
});

// ===================================================================
// [자동 배치 세이브 시스템] 
// 5초에 한 번씩만 메모리에 있는 유저들의 위치를 종합하여 userdata.js 파일에 씁니다.
// 유저가 아무리 마구 움직여도 하드디스크는 5초에 딱 1번만 작동하므로 랙이 완벽히 사라집니다.
// ===================================================================
setInterval(() => {
    // 접속 중인 유저가 한 명도 없다면 저장 스킵
    if (Object.keys(activePlayers).length === 0) return;

    delete require.cache[require.resolve('./userdata.js')];
    const userDatabase = require('./userdata.js');

    let isChanged = false;
    for (const id in activePlayers) {
        if (userDatabase[id]) {
            userDatabase[id].x = activePlayers[id].x;
            userDatabase[id].y = activePlayers[id].y;
            isChanged = true;
        }
    }

    if (isChanged) {
        saveUserData(userDatabase);
        console.log("[Auto-Save] 현재 접속 중인 모든 유저의 좌표를 파일에 안전하게 동기화했습니다.");
    }
}, 5000); // 5000ms = 5초 주기

function broadcast(data, excludeWs = null) {
    wss.clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
}