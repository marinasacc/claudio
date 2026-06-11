@echo off
echo.
echo ================================================
echo   PEDIDOS COTEMINAS - Tu Textil
echo   Abriendo en http://localhost:5050
echo ================================================
echo.

cd /d "%~dp0"
start http://localhost:5050
python -X utf8 app.py
pause
