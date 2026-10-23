@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js tapilmadi. Avtomatik qurulur, bir az gozleyin...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo Node.js quruldu. Bu pencereni baglayin ve start.bat faylini yeniden acin.
  echo Alinmasa https://nodejs.org saytindan LTS versiyasini ozunuz qurun.
  pause
  exit /b
)
echo Joblink basladilir. Bu pencereni BAGLAMAYIN, sayt yalniz o zaman isleyir.
echo Ilk defe bir nece deqiqe cekebilir. Sayt hazir olanda brauzer ozu acilacaq.
echo.
node local\run.mjs
echo.
echo Sayt dayandi. Xeta varsa yuxaridaki setirlere baxin.
pause
