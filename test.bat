@echo off
title MZ MMORPG 통합 실행기

echo ==========================================
echo [1/3] MMO 웹소켓 패킷 서버 실행 중...
echo ==========================================
:: 새로운 창을 열어 mmo-server 폴더로 이동 후 node server.js 실행
start "MMO_Websocket_Server" cmd /k "cd mmo-server && node server.js"

timeout /t 1 >nul

echo ==========================================
echo [2/3] MZ 프로젝트 웹 서버(Port 3000) 구동 중...
echo ==========================================
:: 새로운 창을 열어 Mz-Project 폴더로 이동 후 http-server 실행
start "MZ_Web_Server" cmd /k "cd Mz-Project && npx http-server . -p 3000"

timeout /t 2 >nul

echo ==========================================
echo [3/3] 게임 테스트 플레이 크롬 브라우저 실행 중...
echo ==========================================
:: 크롬 브라우저를 열어 자동으로 로컬 호스트 게임 화면으로 접속
start chrome http://localhost:3000

echo ==========================================
echo 모든 서버가 정상 구동되었습니다. 이 창은 닫으셔도 됩니다.
echo ==========================================
timeout /t 3
exit