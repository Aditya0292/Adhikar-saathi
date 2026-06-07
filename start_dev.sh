#!/bin/bash
echo "Starting Adhikar साथी..."

# Start Redis in background
docker run -d -p 6379:6379 --name adhikar-redis \
  redis:7-alpine 2>/dev/null || \
  docker start adhikar-redis

# Start backend
cd backend
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Stop everything on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; \
      docker stop adhikar-redis; exit" INT
wait
