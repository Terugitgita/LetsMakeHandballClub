@echo off
color 0A
cls
echo.
echo  ====================================
echo   ZUKKYUN HANDBALL GAME
echo  ====================================
echo.
echo  Starting game...
echo.

python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Python is ready!
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    echo  [OK] Browser opened!
    echo.
    echo  Server is running...
    echo  Press Ctrl+C to stop
    echo.
    python -m http.server 8000
) else (
    color 0C
    echo  [X] Python not found
    echo.
    echo  Install from: python.org
    echo.
    pause
)
