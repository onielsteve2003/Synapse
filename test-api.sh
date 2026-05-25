#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000/api}"
OWNER_ID="${OWNER_ID:-507f1f77bcf86cd799439011}"
NODE_BIN="node"

if command -v node.exe >/dev/null 2>&1; then
  NODE_BIN="node.exe"
fi

echo "Using API base URL: $API_BASE_URL"
echo "Using owner id: $OWNER_ID"

CREATE_PAYLOAD=$(cat <<JSON
{
  "title": "Retail Checkout Platform",
  "owner": "$OWNER_ID"
}
JSON
)

echo
echo "1) Creating a blank canvas"
CREATE_RESPONSE=$(curl --silent --show-error --request POST "$API_BASE_URL/canvases" \
  --header "Content-Type: application/json" \
  --data "$CREATE_PAYLOAD")
printf '%s\n' "$CREATE_RESPONSE"

CANVAS_ID=$(printf '%s' "$CREATE_RESPONSE" | "$NODE_BIN" -e "const fs = require('fs'); const body = JSON.parse(fs.readFileSync(0, 'utf8')); process.stdout.write(body._id || '');")

if [[ -z "$CANVAS_ID" ]]; then
  echo "Failed to extract canvas id from create response."
  exit 1
fi

echo
echo "2) Fetching the newly created canvas: $CANVAS_ID"
curl --silent --show-error "$API_BASE_URL/canvases/$CANVAS_ID"
echo

UPDATE_PAYLOAD=$(cat <<JSON
{
  "title": "Retail Checkout Platform - Saved Architecture",
  "nodes": [
    {
      "id": "node-client",
      "type": "frontend",
      "position": { "x": 120, "y": 100 },
      "data": {
        "label": "React Storefront",
        "techStack": ["React", "Vite", "Tailwind CSS"]
      }
    },
    {
      "id": "node-api",
      "type": "service",
      "position": { "x": 420, "y": 120 },
      "data": {
        "label": "Express API",
        "techStack": ["Node.js", "Express", "Socket.io"]
      }
    },
    {
      "id": "node-db",
      "type": "database",
      "position": { "x": 740, "y": 240 },
      "data": {
        "label": "MongoDB Cluster",
        "techStack": ["MongoDB", "Mongoose"]
      }
    }
  ],
  "edges": [
    {
      "id": "edge-client-api",
      "source": "node-client",
      "target": "node-api"
    },
    {
      "id": "edge-api-db",
      "source": "node-api",
      "target": "node-db"
    }
  ]
}
JSON
)

echo
echo "3) Updating the canvas with realistic nodes and edges"
curl --silent --show-error --request PUT "$API_BASE_URL/canvases/$CANVAS_ID" \
  --header "Content-Type: application/json" \
  --data "$UPDATE_PAYLOAD"
echo

echo
echo "4) Fetching the saved canvas to confirm MongoDB persistence"
curl --silent --show-error "$API_BASE_URL/canvases/$CANVAS_ID"
echo

echo
echo "Canvas API test flow completed successfully."
