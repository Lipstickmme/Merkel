# Merkel Engineering

Corporate website and API server for **Merkel Engineering** — a multidisciplinary
engineering consultancy. A dependency-light Node/Express backend serves a bespoke,
video-driven frontend and a small JSON API that powers the content on the page.

## Stack

- **Backend:** Node.js + Express (single production dependency)
- **Frontend:** hand-written HTML / CSS / vanilla JS (no build step)
- **Data:** flat JSON files (services, projects, team); contact enquiries persisted to `data/submissions.json`

## Project structure

```
.
├── server.js                 # HTTP server + graceful shutdown
├── src/
│   ├── app.js                # Express app: middleware, routes, static hosting
│   ├── routes/               # API routers, mounted under /api
│   │   ├── index.js          #   /api/health + feature routers
│   │   ├── services.js       #   GET /api/services, /api/services/:id
│   │   ├── projects.js       #   GET /api/projects?sector=
│   │   ├── team.js           #   GET /api/team
│   │   └── contact.js        #   POST /api/contact
│   ├── controllers/          # Request handlers (thin, testable)
│   ├── middleware/
│   │   ├── errorHandler.js   # 404 + centralized JSON error handling
│   │   └── rateLimiter.js    # in-memory fixed-window limiter
│   ├── utils/
│   │   └── storage.js        # serialized JSON persistence (swap for a DB)
│   └── data/                 # services.json / projects.json / team.json
├── public/                   # static frontend
│   ├── index.html
│   ├── css/styles.css
│   ├── js/main.js            # fetches the API, renders content, drives UI
│   └── assets/video/         # hero background video + poster
└── data/                     # runtime submissions (git-ignored)
```

## API

| Method | Route                     | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/api/health`             | Liveness probe                           |
| GET    | `/api/services`           | List engineering disciplines             |
| GET    | `/api/services/:id`       | Single discipline                        |
| GET    | `/api/projects?sector=`   | Selected works, optional sector filter   |
| GET    | `/api/team`               | Studio principals                        |
| POST   | `/api/contact`            | Submit an enquiry (validated + rate-limited) |

`POST /api/contact` accepts JSON `{ name, email, company?, service?, message, website? }`
(`website` is a honeypot). It returns `201` on success, `422` with a `fields` map on
validation failure, and `429` when rate-limited.

## Getting started

```bash
npm install
cp .env.example .env   # optional: adjust PORT, rate limits, notify email
npm start              # http://localhost:3000
npm run dev            # watch mode (Node --watch)
```

## Frontend notes

- The hero uses an MP4 **video background** with an SVG poster fallback; it pauses under
  `prefers-reduced-motion` and degrades gracefully if autoplay is blocked.
- Services, projects (with live sector filtering) and the studio list are rendered from
  the API, with embedded seed data as a fallback so the page never renders empty.
- The contact form validates inline and posts to the API.

## Configuration

| Variable                | Default | Purpose                                  |
| ----------------------- | ------- | ---------------------------------------- |
| `PORT`                  | `3000`  | HTTP port                                |
| `NODE_ENV`              | —       | `production` tightens error output       |
| `CONTACT_NOTIFY_EMAIL`  | —       | Integration point for enquiry notifications |
| `RATE_LIMIT_WINDOW_MS`  | `60000` | Rate-limit window                        |
| `RATE_LIMIT_MAX`        | `30`    | Max requests per window per IP           |
