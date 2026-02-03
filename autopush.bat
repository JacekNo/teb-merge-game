@echo off
title TEB MASTERS - BUILD & DEPLOY
color 0E

echo ==========================================
echo    TEB MASTERS - ZAPIS I PUBLIKACJA (VITE)
echo ==========================================
echo.

:: 1. Zapisywanie kodu źródłowego (to co robisz w src)
echo [1/3] Zapisywanie kodu zrodlowego na MAIN...
git add .
set /p commitMsg="Opis zmian (np. Fix mobile): "
if "%commitMsg%"=="" set commitMsg=Auto-update
git commit -m "%commitMsg%"
git push origin main

:: 2. Budowanie gry (tworzenie folderu dist)
echo.
echo [2/3] Budowanie projektu (Vite Build)...
call npm run build

:: 3. Wysyłanie folderu dist na GitHub Pages
echo.
echo [3/3] Publikacja na serwer (Deploy)...
call npm run deploy

echo.
echo ==========================================
echo   SUKCES! Gra bedzie dostepna za 2 minuty.
echo ==========================================
pause