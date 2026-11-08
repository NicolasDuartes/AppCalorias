@echo off
echo ========================================================
echo   Iniciando servidor local de AppCalorias
echo ========================================================
echo.
echo Sirviendo frontend en: http://localhost:8080/
echo Documentacion tecnica: Consulta README.md y DESIGN.md
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.
start http://localhost:8080/
python -m http.server 8080 --directory frontend
