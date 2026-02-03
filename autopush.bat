@echo off
title TEB MASTERS - AUTO GITHUB
color 0A

echo ==========================================
echo      TEB MASTERS - SZYBKI PUSH
echo ==========================================
echo.

:: 1. Pokaż status, żebyś widział co się zmieni
git status
echo.
echo ==========================================

:: 2. Zapytaj o wiadomość (nie wpisuj cudzysłowów)
set /p commitMsg="Wpisz wiadomosc commita (np. Fix mobile): "

:: 3. Sprawdź czy wpisano wiadomość, jak nie to daj domyślną
if "%commitMsg%"=="" set commitMsg=Auto-update %date% %time%

echo.
echo [1/3] Dodawanie plikow (git add .)...
git add .

echo.
echo [2/3] Zatwierdzanie (git commit)...
git commit -m "%commitMsg%"

echo.
echo [3/3] Wysylanie na serwer (git push)...
git push

echo.
echo ==========================================
echo               SUKCES!
echo ==========================================
echo.
pause