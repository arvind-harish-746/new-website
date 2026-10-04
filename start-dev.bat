@echo off
setlocal enabledelayedexpansion
title Cybotz STEM - Development Environment Launcher

echo ========================================================
echo   Starting Cybotz STEM Development Environment
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
    goto :check_redis
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
        goto :mongo_ready_dev
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

:mongo_ready_dev

:check_redis
powershell -NoProfile -Command "(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 6379)" >nul 2>&1
if not errorlevel 1 (
    echo   Redis is active on port 6379.
) else (
    echo   [NOTE] Redis is not active on port 6379. BullMQ worker will run in direct fallback mode.
)

:: 4. Check dependencies
if not exist "node_modules" (
    echo [2/4] Installing dependencies via pnpm...
    call pnpm.cmd install || call npm.cmd install
)

:: 5. Seed initial master user (safe: checks db connection with timeout)
echo [3/4] Ensuring database master seed user exists...
call npx.cmd tsx server/seedUsers.ts

:: 6. Determine frontend dev runner (runs Vite + Auto-Image Compression Watcher)
set "FRONTEND_CMD=pnpm.cmd run dev:client"
where pnpm.cmd >nul 2>&1
if errorlevel 1 (
    set "FRONTEND_CMD=npx.cmd vite --host"
)

:: 7. Start all services concurrently
echo [4/4] Launching WhatsApp Engine, BullMQ Worker, API Server and Frontend...
echo.
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:5000
echo   - WhatsApp: http://localhost:8080
echo --------------------------------------------------------

call npx.cmd concurrently --kill-others --names "WHATSAPP,WORKER,BACKEND,FRONTEND" --prefix-colors "green,magenta,blue,cyan" "npx.cmd tsx server/run-whatsapp.ts" "npx.cmd tsx server/worker.ts" "npx.cmd tsx server/index.ts" "%FRONTEND_CMD%"

pause
