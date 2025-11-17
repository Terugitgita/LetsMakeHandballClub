# PowerShell Script to start Handball Game
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Zukkyun Handball Game Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
$pythonInstalled = Get-Command python -ErrorAction SilentlyContinue

if ($pythonInstalled) {
    Write-Host "[OK] Python found!" -ForegroundColor Green
    Write-Host "[*] Starting server..." -ForegroundColor Yellow
    Write-Host "[*] Opening browser..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor White
    Write-Host ""

    # Wait 2 seconds
    Start-Sleep -Seconds 2

    # Open browser
    Start-Process "http://localhost:8000"

    # Start Python server
    Write-Host "Server running at http://localhost:8000" -ForegroundColor Green
    python -m http.server 8000
} else {
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Make sure to check 'Add Python to PATH' during installation!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press any key to continue"
}
