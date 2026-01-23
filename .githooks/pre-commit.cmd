@echo off
pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass ^
  -File "%~dp0wfsl-hook.ps1" ^
  -Hook pre-commit ^
  -Hint "Commit denied until Repo Guard is VALID."
if errorlevel 1 exit /b %errorlevel%
exit /b 0
