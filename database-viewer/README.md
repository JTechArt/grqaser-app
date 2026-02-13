# Grqaser Database Viewer

Express-based web app to browse and manage audiobook data from the Grqaser crawler. Provides a REST API and a single-page UI.

## Features

- **REST API**: Books (list, by id, search), stats (overview, authors, categories), crawler (status, URL queue, logs), health
- **Web UI**: Dashboard, book list with filters and search, crawler monitoring
- **Config**: Port, DB path, CORS, rate limit, logging in `src/config/config.js`
- **Logging**: Optional file logging to `logs/` (directory is gitignored)

## Project structure

```
database-viewer/
├── src/
│   ├── config/
│   │   └── config.js       # Server, DB, API, CORS, logging
│   ├── models/
│   │   └── database.js     # SQLite access
│   ├── routes/
│   │   ├── books.js        # /api/v1/books
│   │   ├── stats.js        # /api/v1/stats
│   │   └── crawler.js      # /api/v1/crawler
│   └── server.js           # Express app entry
├── public/
│   └── index.html          # Web UI
├── data/                   # Optional local grqaser.db copy
├── logs/                   # app.log (gitignored)
├── package.json
└── README.md
```

## Setup

```bash
npm install
mkdir -p logs data
# Copy DB if needed: cp ../crawler/data/grqaser.db data/
```

## Usage

```bash
npm run dev   # development (nodemon)
npm start    # production
```

- Web UI: http://localhost:3001  
- API base: http://localhost:3001/api/v1  
- Health: http://localhost:3001/api/v1/health  

**Environment:** `PORT`, `NODE_ENV`, `DB_PATH`, `CORS_ORIGIN`, `LOG_LEVEL`

## API summary

| Area      | Examples |
|----------|----------|
| Books    | `GET /api/v1/books`, `GET /api/v1/books/:id`, `GET /api/v1/books/search?q=...` |
| Stats    | `GET /api/v1/stats/overview`, `.../authors`, `.../categories` |
| Crawler  | `GET /api/v1/crawler/status`, `.../urls`, `.../logs` |
| Health   | `GET /api/v1/health` |

## Related

- [Crawler](../crawler/) — Produces the SQLite database
- [GrqaserApp](../GrqaserApp/) — React Native mobile app
