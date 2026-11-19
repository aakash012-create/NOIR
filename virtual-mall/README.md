# Virtual Mall — React + Three.js + Node + PostgreSQL

A runnable starter project organized into four parts:

1. `frontend/` — React, Vite, React Three Fiber, Drei, React Router, Axios
2. `backend/` — Node.js, Express, PostgreSQL, optional Cloudinary and Stripe
3. `database/` — PostgreSQL schema and seed data
4. GitHub Actions CI — basic frontend/backend build checks

## Requirements

- Node.js 20+
- npm
- PostgreSQL 14+
- Optional: Cloudinary account for image uploads
- Optional: Stripe test account for payment intents

## 1. Create the database

Create a PostgreSQL database named `virtual_mall`, then run the SQL file:

```bash
psql -U postgres -d virtual_mall -f database/schema.sql
```

Or open `database/schema.sql` in pgAdmin and execute it.

## 2. Configure the backend

```bash
cd backend
copy .env.example .env
npm install
```

Edit `backend/.env` and set your PostgreSQL credentials. Cloudinary and Stripe variables are optional; their routes return a clear configuration error if not configured.

Start the backend:

```bash
npm run dev
```

API health check: http://localhost:5000/api/health

## 3. Configure and start the frontend

Open a second terminal at the project root:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

## 4. GitHub

Create a new empty GitHub repository, then from this project root:

```bash
git init
git add .
git commit -m "Initial virtual mall project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

The workflow in `.github/workflows/ci.yml` runs install/build checks on pushes and pull requests.

## Project structure

```text
virtual-mall/
├── .github/workflows/ci.yml
├── database/schema.sql
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── README.md
```

## Important security notes

- Never commit `.env` files or real API keys.
- Cloudinary credentials and Stripe secret keys belong only on the backend.
- The Stripe endpoint creates a PaymentIntent using product prices from PostgreSQL; do not trust prices sent by the browser.
- This is a development starter, not a production-ready store. Before launch, add authentication, authorization, order persistence, inventory checks, rate limiting, input validation, webhook verification, logging, and HTTPS.
