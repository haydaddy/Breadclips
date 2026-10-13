@echo off
rem Rebuilds the tiles/ folder from the master image.
rem   - double-click it to use grid.png in this folder
rem   - or drag a PNG onto it to use that file instead
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo Python was not found. Install it from https://www.python.org/ and try again.
    echo.
    pause
    exit /b 1
)

python -c "import pyvips" >nul 2>nul
if errorlevel 1 (
    echo Installing pyvips - this only happens the first time...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo Could not install pyvips. See README.md, "Troubleshooting".
        pause
        exit /b 1
    )
    echo.
)

python make_tiles.py %*
echo.
pause
