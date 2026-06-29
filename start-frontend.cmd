@echo off
set "ROOT=C:\Users\ST-PoojaGanesh\Desktop\java-apex-new\javaApex-Trainee"
cd /d "%ROOT%"
"C:\Program Files\nodejs\npm.cmd" run dev -- --host localhost --port 5175 --configLoader native
