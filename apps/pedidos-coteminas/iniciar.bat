@echo off
echo.
echo ================================================
echo   PEDIDOS COTEMINAS - Tu Textil
echo   Iniciando... aguarda unos segundos
echo ================================================
echo.

cd /d "%~dp0"

REM Abre el navegador despues de 4 segundos (cuando la app ya arranco)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:5051"

REM Inicia la aplicacion (esta ventana debe quedar abierta mientras la uses)
python -X utf8 app.py

pause
