@echo off
rem Shows the viewer on this computer, exactly as GitHub Pages will serve it.
rem Double-click, look at the page in the browser that opens, and close this
rem window when you are done.
setlocal
cd /d "%~dp0"
start "" http://127.0.0.1:8000/
python -m http.server 8000 --bind 127.0.0.1
pause
