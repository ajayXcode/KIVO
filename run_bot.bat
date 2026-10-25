@echo off
title EdgePilot Delta Exchange Trading Bot
echo ==============================================================
echo   EdgePilot: Delta Exchange India Testnet Trading Bot
echo ==============================================================
echo Starting backend server on http://127.0.0.1:8000 ...
echo The dashboard will automatically open in your default browser.
echo Press Ctrl+C in this window to stop the bot.
echo.

set PYTHONPATH=.

:: Launch default browser to dashboard after 2 seconds in background
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

:: Start Uvicorn ASGI Server
.venv\Scripts\python.exe -m backend.main

pause

