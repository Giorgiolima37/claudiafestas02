@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js e npm nao foram encontrados. Instale o Node.js e abra novamente este arquivo.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias do aplicativo...
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Iniciando o aplicativo. Mantenha esta janela aberta enquanto usar o sistema.
call npm.cmd run dev -- --open
pause
