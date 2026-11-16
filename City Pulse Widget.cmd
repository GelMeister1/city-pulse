@echo off
rem Double-click to launch the desktop widget.
rem First time only, in this folder: npm install   (if it still won't start: node node_modules\electron\install.js)
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."