@echo off
cd /d "C:\Users\ramac\Desktop\virtual-telemetry-laboratory-open-source"

echo ==========================================
echo   Virtual Telemetry Device Laboratory
echo ==========================================
echo.
echo Starting laboratory...
echo.

start "" "http://localhost:5173/"

npm run dev