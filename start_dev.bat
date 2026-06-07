@echo off
echo Starting Adhikar साथी development environment...

start "Backend" cmd /k "cd backend && c:\Users\adity\Videos\Documents\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

start "Frontend" cmd /k "cd frontend && npm run dev"


echo All services starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API docs: http://localhost:8000/docs
pause
