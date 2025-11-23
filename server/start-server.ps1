# PowerShell script to start the server
# This script will kill any existing process on port 5000 first

Write-Host "Checking for processes on port 5000..." -ForegroundColor Yellow

# Find process using port 5000
$process = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Found process $process using port 5000. Stopping it..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Starting server on port 5000..." -ForegroundColor Green
npm start

