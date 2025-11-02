@echo off
REM Windows Task Scheduler Script for Folder Monitoring
REM This script runs the folder monitor and logs output

cd /d "C:\dev\EaseMail - The Future"

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Run the monitor with auto-heal
npm run monitor-folders -- --once --auto-heal >> logs\folder-monitor.log 2>&1

REM Log completion
echo [%date% %time%] Folder monitor check completed >> logs\folder-monitor.log

