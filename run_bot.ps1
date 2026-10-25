# EdgePilot Delta Exchange India Testnet Trading Bot Launcher
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  EdgePilot: Delta Exchange India Testnet Trading Bot" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Starting backend server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Write-Host "The dashboard will automatically open in your default browser." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the bot.`n" -ForegroundColor Yellow

$env:PYTHONPATH = "."

# Open browser after 2 seconds in background
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://127.0.0.1:8000"
} | Out-Null

& .\.venv\Scripts\python.exe -m backend.main

