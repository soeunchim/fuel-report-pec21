@echo off
cd /d "%~dp0"
echo ===================================================
echo   PEC21 Fuel Report Management System
echo   Starting server at http://localhost:3027 ...
echo ===================================================
start http://localhost:3027
node server.js
pause
