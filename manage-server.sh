#!/bin/bash

# Server management script
PORT=3000

echo "=== Server Management Script ==="

# Function to kill processes on the specified port
kill_port_processes() {
    echo "Checking for processes on port $PORT..."
    
    # Find processes using the port
    PIDS=$(lsof -ti :$PORT 2>/dev/null)
    
    if [ -n "$PIDS" ]; then
        echo "Found processes using port $PORT: $PIDS"
        echo "Killing processes..."
        
        # Kill all processes on the port
        kill -9 $PIDS 2>/dev/null
        
        # Wait a moment
        sleep 2
        
        # Verify the port is free
        if lsof -i :$PORT >/dev/null 2>&1; then
            echo "Warning: Port $PORT is still in use"
        else
            echo "✅ Port $PORT is now free"
        fi
    else
        echo "✅ No processes found on port $PORT"
    fi
}

# Function to start the server
start_server() {
    echo "Starting server on port $PORT..."
    
    # Change to the project directory
    cd /home/z/my-project
    
    # Start the server in background and redirect output
    nohup npm run dev > server-output.log 2>&1 &
    
    # Get the PID of the background process
    SERVER_PID=$!
    echo "Server started with PID: $SERVER_PID"
    
    # Wait for server to start
    echo "Waiting for server to start..."
    sleep 10
    
    # Check if server is running
    if curl -s http://localhost:$PORT >/dev/null 2>&1; then
        echo "✅ Server is running on http://localhost:$PORT"
        echo "Server output is being logged to: server-output.log"
        return 0
    else
        echo "❌ Server failed to start. Checking logs..."
        if [ -f "server-output.log" ]; then
            echo "=== Server Output Log ==="
            tail -20 server-output.log
        fi
        return 1
    fi
}

# Function to test the API
test_api() {
    echo "=== Testing API Endpoints ==="
    
    # Test 1: Add a new person
    echo "1. Testing: Add new person (Mikey Chen)..."
    RESPONSE1=$(curl -s -X POST http://localhost:$PORT/api/smart-process \
        -H "Content-Type: application/json" \
        -d '{"text": "I met Mikey Chen today, he'\''s the CEO of Think Foundation. His LinkedIn is @mikeychen."}')
    
    if [ $? -eq 0 ]; then
        echo "✅ Add request successful"
        echo "Response: $RESPONSE1" | jq . 2>/dev/null || echo "Response: $RESPONSE1"
    else
        echo "❌ Add request failed"
    fi
    
    sleep 2
    
    # Test 2: Edit the person's role
    echo -e "\n2. Testing: Edit Mikey'\''s role..."
    RESPONSE2=$(curl -s -X POST http://localhost:$PORT/api/smart-process \
        -H "Content-Type: application/json" \
        -d '{"text": "Update Mikey'\''s role at Think, he'\''s now a Story Samurai"}')
    
    if [ $? -eq 0 ]; then
        echo "✅ Edit request successful"
        echo "Response: $RESPONSE2" | jq . 2>/dev/null || echo "Response: $RESPONSE2"
    else
        echo "❌ Edit request failed"
    fi
    
    sleep 2
    
    # Test 3: Query the person
    echo -e "\n3. Testing: Query Mikey'\''s information..."
    RESPONSE3=$(curl -s -X POST http://localhost:$PORT/api/query \
        -H "Content-Type: application/json" \
        -d '{"query": "Tell me about Mikey"}')
    
    if [ $? -eq 0 ]; then
        echo "✅ Query request successful"
        echo "Response: $RESPONSE3" | jq . 2>/dev/null || echo "Response: $RESPONSE3"
    else
        echo "❌ Query request failed"
    fi
    
    sleep 2
    
    # Test 4: Add a real interaction
    echo -e "\n4. Testing: Add real interaction..."
    RESPONSE4=$(curl -s -X POST http://localhost:$PORT/api/smart-process \
        -H "Content-Type: application/json" \
        -d '{"text": "I had coffee with Mikey yesterday and we discussed the new project"}')
    
    if [ $? -eq 0 ]; then
        echo "✅ Real interaction request successful"
        echo "Response: $RESPONSE4" | jq . 2>/dev/null || echo "Response: $RESPONSE4"
    else
        echo "❌ Real interaction request failed"
    fi
}

# Main script logic
case "${1:-start}" in
    "kill")
        kill_port_processes
        ;;
    "start")
        kill_port_processes
        start_server
        ;;
    "test")
        test_api
        ;;
    "all")
        kill_port_processes
        if start_server; then
            sleep 5
            test_api
        fi
        ;;
    *)
        echo "Usage: $0 {kill|start|test|all}"
        echo "  kill   - Kill processes on port $PORT"
        echo "  start  - Start the server"
        echo "  test   - Test the API endpoints"
        echo "  all    - Kill, start, and test"
        exit 1
        ;;
esac