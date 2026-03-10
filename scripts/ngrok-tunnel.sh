#!/bin/bash

echo "Starting ngrok tunnels..."

# Start ngrok for backend (port 3000) in background
ngrok http 3000 --log=stdout > /tmp/ngrok-backend.log 2>&1 &
BACKEND_PID=$!

# Start ngrok for frontend (port 5173) in background  
ngrok http 5173 --log=stdout > /tmp/ngrok-frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Waiting for tunnels to initialize..."
sleep 3

# Extract URLs
BACKEND_URL=$(grep -oP 'url=https://\K[^.]+\.ngrok[^ ]*' /tmp/ngrok-backend.log | head -1)
FRONTEND_URL=$(grep -oP 'url=https://\K[^.]+\.ngrok[^ ]*' /tmp/ngrok-frontend.log | head -1)

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo "Failed to get ngrok URLs. Check /tmp/ngrok-*.log"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=========================================="
echo "Frontend:  https://$FRONTEND_URL"
echo "Backend:  https://$BACKEND_URL"
echo "=========================================="
echo ""

# Update client .env with ngrok URLs
cat > client/.env << EOF
VITE_WS_URL=wss://$BACKEND_URL/ws
VITE_API_URL=https://$BACKEND_URL
EOF

echo "Updated client/.env with ngrok URLs"
echo ""
echo "Press Ctrl+C to stop tunnels"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
