# NilaApps — Adaptive Learning Path Builder (UI)

Angular frontend for the Adaptive Learning Path Builder assessment.

**Backend:** [NilaApps-backend](https://github.com/sivaraajc/NilaApps-backend)

## Stack

- Angular 19, TypeScript
- Angular CDK drag-and-drop

## API contract

Request/response shapes are defined in [`schemas/`](schemas/) (same contract as the backend).

## Prerequisites

- Node.js 20+
- Backend running on port 8080

## Run

```bash
npm install
npm start
```

Open http://localhost:4200 — `/api` is proxied to `http://localhost:8080` via `proxy.conf.json`.

## Build & test

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

## Features

- Content library from `GET /api/components`
- Canvas: drag, reposition, connect nodes
- Conditional rules on connections (assessment & unit metrics)
- Save / reload learning paths
- Builder / Preview modes, zoom controls
