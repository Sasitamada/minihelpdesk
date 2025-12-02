#!/bin/bash
echo "Testing API endpoints..."
echo ""
echo "GET /api/workspaces:"
curl -s -X GET "http://localhost:5001/api/workspaces" -H "Content-Type: application/json" | head -c 200
echo ""
echo ""
echo "✅ If you see JSON data above, the API is working!"
