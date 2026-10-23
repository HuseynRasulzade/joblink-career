@echo off
chcp 65001 >nul
rem Joblink launcher. First click puts a "Joblink" shortcut on the Desktop, then starts the site.
cd /d "%~dp0"
set "LNK=%USERPROFILE%\Desktop\Joblink.lnk"
if not exist "%LNK%" (
  powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Joblink.lnk'); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.Save()" >nul 2>nul
  echo Masaustune "Joblink" qisayolu qoyuldu. Bundan sonra ona klikleyin.
)
call "%~dp0local\start.bat"
