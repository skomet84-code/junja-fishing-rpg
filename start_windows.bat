@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js 22 이상이 필요합니다.
  echo Node.js LTS를 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
echo.
echo ==========================================
echo   준자의 낚시왕 RPG 서버를 시작합니다.
echo   이 창을 닫으면 게임 서버도 종료됩니다.
echo ==========================================
echo.
node --no-warnings server.js
pause
