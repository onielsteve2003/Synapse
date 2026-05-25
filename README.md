# Synapse

Synapse is a real-time collaborative system architecture designer built on a MERN foundation. This phase establishes the client/server split, the MongoDB data model for canvases, and the backend runtime needed for health checks and future Socket.io collaboration events.

## Project structure

```text
Synapse/
|-- client/
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx
|       |-- index.css
|       |-- main.jsx
|       |-- components/
|       |   `-- layout/
|       |       `-- AppShell.jsx
|       `-- features/
|           `-- canvas/
|               `-- CanvasStage.jsx
|-- server/
|   |-- .env.example
|   |-- package.json
|   `-- src/
|       |-- app.js
|       |-- index.js
|       |-- config/
|       |   |-- db.js
|       |   `-- env.js
|       |-- models/
|       |   `-- Canvas.js
|       |-- routes/
|       |   `-- health.routes.js
|       `-- socket/
|           `-- registerCanvasSocket.js
|-- .gitignore
`-- package.json
```

## Canvas schema

The Canvas model stores:

- `title`: canvas name
- `owner`: MongoDB ObjectId reference for the owning user
- `nodes`: array of node documents with `id`, `type`, `position`, and `data`
- `edges`: array of edge documents with `id`, `source`, and `target`
- `lastModified`: auto-managed via Mongoose timestamps

## Local setup

1. Run `npm install` from the project root.
2. Copy `server/.env.example` to `server/.env`.
3. Start MongoDB locally or point `MONGODB_URI` to an existing instance.
4. Run `npm run dev`.
5. Visit the client on `http://localhost:5173` and the API health route on `http://localhost:4000/api/health`.
