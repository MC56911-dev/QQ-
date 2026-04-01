@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 字体网站预览 %~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview-8891.ps1"
if errorlevel 1 pause
