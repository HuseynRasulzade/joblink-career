@echo off
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Joblink.lnk'); $s.TargetPath='%~dp0start.bat'; $s.WorkingDirectory='%~dp0..'; $s.Save()"
echo Masaustune "Joblink" qisayolu elave olundu. Bundan sonra ona iki defe klikleyin.
pause
