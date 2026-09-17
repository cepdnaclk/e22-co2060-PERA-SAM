@echo off
echo =============================================
echo   PERA-SAM ML Backend - Starting...
echo =============================================
echo.

set MAIN_PY=%~dp0server\main.py
set PYTHON_EXE=

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0.venv\bin\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\bin\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo Using Python: %PYTHON_EXE%
echo.

set PYTHONIOENCODING=utf-8
"%PYTHON_EXE%" "%MAIN_PY%"
pause

