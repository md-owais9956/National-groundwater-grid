@echo off
title Hydro-Analytics Pro - Exhibition Mode
echo Starting Local Backend...
cd backend
start /b node server.js
echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul
echo Opening Frontend...
cd ../frontend
start index.html
echo.
echo ==========================================
echo PROJECT IS LIVE LOCALLY
echo Keep this window open during the demo!
echo ==========================================
pause