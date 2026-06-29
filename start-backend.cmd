@echo off
set "ROOT=C:\Users\ST-PoojaGanesh\Desktop\java-apex-new\javaApex-Trainee\java-migration-backend\Java_Migration_Accelerator_backend\java-migration-backend"
set "CHAT_PROVIDER=chain"
set "LLM_PROVIDER_ORDER=ollama,hf,groq"
set "OLLAMA_MODEL=gemma2:2b"
set "OLLAMA_KEEP_ALIVE=30m"
set "OLLAMA_TIMEOUT_SECONDS=120"
cd /d "%ROOT%"
"%LOCALAPPDATA%\Programs\Python\Python311\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
