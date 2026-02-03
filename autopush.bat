@echo off
title TEB MASTERS - AUTO DEPLOY
color 0B

echo ==========================================
echo      TEB MASTERS - PUBLIKACJA (DEPLOY)
echo ==========================================
echo.
echo Twoj aktualny branch to:
git branch --show-current
echo.

:: 1. Zbieramy zmiany
git status
echo.
set /p commitMsg="Wpisz wiadomosc (np. Fix mobile): "
if "%commitMsg%"=="" set commitMsg=Update %date% %time%

echo.
echo [1/6] Dodawanie plikow...
git add .

echo.
echo [2/6] Zatwierdzanie na MAIN...
git commit -m "%commitMsg%"

echo.
echo [3/6] Wysylanie MAIN na GitHub...
git push origin main

echo.
echo [4/6] Przelaczanie na GH-PAGES...
git checkout gh-pages

echo.
echo [5/6] Aktualizacja GH-PAGES (Merge z Main)...
git merge main -m "Merge main into gh-pages"

echo.
echo [6/6] PUBLIKACJA GRY (Push gh-pages)...
git push origin gh-pages

echo.
echo [FINISH] Powrot na MAIN...
git checkout main

echo.
echo ==========================================
echo   SUKCES! Strona zaktualizuje sie za ok. 2 min.
echo ==========================================
echo.
pause