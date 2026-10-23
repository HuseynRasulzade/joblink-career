@echo off
chcp 65001 >nul
rem Joblink launcher (needs Node.js; local\start.bat installs it if missing).
cd /d "%~dp0"
rem Shortcut "Joblink" goes to the real Desktop (also when it is redirected to OneDrive) and next to this file.
powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'),'%~dp0')){ try { $s=$w.CreateShortcut((Join-Path $d 'Joblink.lnk')); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Description='Joblink'; $s.Save(); Write-Host ('Qisayol yaradildi: ' + (Join-Path $d 'Joblink.lnk')) } catch { Write-Host ('Qisayol yaradila bilmedi: ' + $d) } }"
call "%~dp0local\start.bat"
