@echo off
echo ========================================================
echo   Iniciando servidor local de AppCalorias
echo ========================================================
echo.
echo Sirviendo frontend en: http://localhost:3000/
echo Portal de documentacion: http://localhost:3000/docs-dashboard.html
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.
start http://localhost:3000/
python -m http.server 3000 --directory frontend
