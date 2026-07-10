# restart_backend.ps1
# Kills any process on port 8001, then starts the backend server.
# Usage: .\restart_backend.ps1

$PORT = 8001
$pids = (Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
if ($pids) {
    foreach ($p in $pids) {
        Write-Host "Killing PID $p on port $PORT..."
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

$check = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "ERROR: Port $PORT still in use by another process." -ForegroundColor Red
    exit 1
}

Write-Host "Port $PORT is free. Starting backend..." -ForegroundColor Green
python main.py
