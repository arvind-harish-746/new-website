@echo off
setlocal enabledelayedexpansion
title Cybotz STEM - Production Runner

echo ========================================================
echo   Building and Starting Cybotz in Production Mode
echo ========================================================

set "ROOT_DIR=%~dp0"

:: 1. Navigate to Cybotz-landing directory
if exist "!ROOT_DIR!Cybotz-landing" (
    cd /d "!ROOT_DIR!Cybotz-landing"
) else (
    cd /d "!ROOT_DIR!"
)

:: 2. Auto-detect Node.js, pnpm, and npx
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
set "PATH=!USER_PATH!;!SYS_PATH!;!PATH!"

if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;!PATH!"
)
if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
    set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;!PATH!"
)

where node.exe >nul 2>&1
if errorlevel 1 (
    for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS*") do (
        for /d %%N in ("%%D\node-*") do (
            if exist "%%N\node.exe" (
                set "PATH=%%N;!PATH!"
            )
        )
    )
    if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;!PATH!"
    if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;!PATH!"
    if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;!PATH!"
)

:: Verify node was found
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found on your system!
    echo Please install Node.js from https://nodejs.org or restart your computer.
    pause
    exit /b 1
)

:: 3. Start Database and Cache Containers (Docker or Local MongoDB)
echo [1/4] Checking MongoDB and Redis services...
powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 27017)" >nul 2>&1
if not errorlevel 1 (
    echo   MongoDB is already running on port 27017.
    goto :check_redis_prod
)

:: Try Docker Compose first
where docker.exe >nul 2>&1
if not errorlevel 1 (
    echo   Attempting to start MongoDB and Redis via Docker Compose...
    docker compose up -d >nul 2>&1 || docker-compose up -d >nul 2>&1
    timeout /t 2 /nobreak >nul
    powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 27017)" >nul 2>&1
    if not errorlevel 1 (
        echo   Docker containers started successfully!
        goto :mongo_ready_prod
    )
)

:: Fallback to local portable MongoDB binary
if exist "!ROOT_DIR!mongodb\bin\mongod.exe" (
    echo   Starting local portable MongoDB server...
    start "Cybotz MongoDB" /min "!ROOT_DIR!mongodb\bin\mongod.exe" --dbpath "!ROOT_DIR!mongodb\data\db" --port 27017 --bind_ip 127.0.0.1
    timeout /t 2 /nobreak >nul
    echo   MongoDB started successfully on port 27017!
) else (
    echo   [NOTE] Local MongoDB binary not found at "!ROOT_DIR!mongodb\bin\mongod.exe".
)

:mongo_ready_prod

:check_redis_prod
powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 6379)" >nul 2>&1
if not errorlevel 1 (
    echo   Redis is active on port 6379.
) else (
    echo   [NOTE] Redis is not active on port 6379. BullMQ worker will run in direct fallback mode.
)

:: 4. Build production bundle
echo [2/4] Building production bundles...
call pnpm.cmd run build || call npm.cmd run build

:: 5. Seed initial master user (safe: checks db connection with 5s timeout)
echo [3/4] Ensuring database master seed user exists...
call npx.cmd tsx server/seedUsers.ts

:: 6. Start production services
echo [4/4] Starting production services...
echo.
echo   - Web Application running on: http://localhost:5000
echo   - WhatsApp Engine running on: http://localhost:8080
echo --------------------------------------------------------

call npx.cmd concurrently --kill-others --names "WHATSAPP,WORKER,SERVER" --prefix-colors "green,magenta,blue" "npx.cmd tsx server/run-whatsapp.ts" "npx.cmd tsx server/worker.ts" "node dist/index.js"

pause
