@echo off
echo =============================================
echo   PERA-SAM ML Backend - Starting...
echo =============================================
echo.

:: Path relative to this .bat file (now in Model root)
set VENV_PYTHON=%~dp0.venv\bin\python.exe
set MAIN_PY=%~dp0server\main.py

:: Check venv exists
if not exist "%VENV_PYTHON%" (
    echo [ERROR] Virtual environment not found at %VENV_PYTHON%
    echo Run this first to set it up:
    echo   python -m venv .venv
    echo   .venv\bin\python.exe -m pip install -r server\requirements.txt
    pause
    exit /b 1
)

echo Using: %VENV_PYTHON%
echo.

:: Set UTF-8 output to avoid Unicode errors in logs
set PYTHONIOENCODING=utf-8

:: Run the server
"%VENV_PYTHON%" "%MAIN_PY%"
pause
