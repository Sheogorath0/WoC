@echo off
title MZ MMORPG 원터치 자동 로그인 실행기

cd /d "%~dp0"

echo ==========================================
echo [1/3] MMO 웹소켓 패킷 서버 실행 중...
echo ==========================================
start "MMO_Websocket_Server" cmd /k "cd mmo-server && node server.js"

timeout /t 1 >nul

echo ==========================================
echo [2/3] MZ 프로젝트 웹 서버(Port 3000) 구동 중...
echo ==========================================
start "MZ_Web_Server" cmd /k "cd Mz-Project && npx http-server . -p 3000 --clear-cache"

timeout /t 2 >nul

echo ==========================================
echo [3/3] 시크릿 멀티 창 로그인 매크로 가동...
echo ==========================================

:: [매크로 창 1] player1 로그인 인자를 주소창에 탑재하여 시크릿 창 구동
start chrome "http://localhost:3000/?autoid=player1&autopw=123" --incognito

timeout /t 1 >nul

:: [매크로 창 2] player2 로그인 인자를 주소창에 탑재하여 두 번째 시크릿 창 구동
start chrome "http://localhost:3000/?autoid=player2&autopw=123" --incognito

echo ==========================================
echo 자동 세션 접속이 완료되었습니다! 이 창은 닫으셔도 됩니다.
echo ==========================================
timeout /t 3
exit