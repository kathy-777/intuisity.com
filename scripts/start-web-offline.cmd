@echo off
set EXPO_OFFLINE=1
set EXPO_NO_TELEMETRY=1
set BROWSER=none
npm.cmd run web -- --offline --max-workers 1
