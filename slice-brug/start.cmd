@echo off
rem Start de slice-brug. Dubbelklik dit bestand, of zet er een snelkoppeling
rem naartoe in de opstartmap (Windows-toets + R, dan: shell:startup).
cd /d "%~dp0"
if not exist node_modules (
  echo Eenmalig de onderdelen ophalen...
  call npm install || goto fout
)
node brug.mjs
goto eind
:fout
echo.
echo Er ging iets mis. Staat Node.js geinstalleerd? Zie LEESMIJ.md
:eind
pause
