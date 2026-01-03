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

node --version >nul 2>&1
if %errorlevel% == 0 (
    echo  [OK] Node.js is ready!
    echo.
    echo  Starting server on port 8080...
    echo.
    echo  Opening browser in 3 seconds...

    REM Start browser after delay
    start /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8080"

    echo.
    echo  ====================================
    echo   Press Ctrl+C to stop the server
    echo  ====================================
    echo.

    REM Start server (blocks until Ctrl+C)
    npx --yes serve -l 8080
) else (
    color 0C
    echo  [X] Node.js not found
    echo.
    echo  Install from: nodejs.org
    echo.
    pause
)
