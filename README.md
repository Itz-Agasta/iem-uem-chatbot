# IEM-UEM Kiosk Chatbot

The backend has been completely migrated to a **Next.js (App Router)** application. The frontend remains a React (Vite) application but has been updated to support multiple image uploads and a continuous slideshow on the main display.

## Prerequisites

1. **Node.js** (v18+)
2. **PostgreSQL** database running locally with the [`pgvector`](https://github.com/pgvector/pgvector) extension installed.
3. **OpenRouter API Key** (for accessing the Muse model via the Vercel AI SDK).

---

## 1. Environment & API Keys Setup

You will need to provide your API keys to the backend. Navigate to the `backend/` directory and edit the `.env.local` file:

```bash
cd backend
nano .env.local
```

Ensure the following keys are populated in your `.env.local`:

```env
# 1. PostgreSQL Connection String (Update with your actual DB credentials)
# Ensure the database (e.g., iem_uem_kiosk) exists and the user has permissions.
DATABASE_URL="postgresql://iem_uem:iem_uem_password@localhost:5432/iem_uem_kiosk"

# 2. OpenRouter API Key (Required for the Vercel AI SDK to call the Muse model)
OPENROUTER_API_KEY="your_openrouter_api_key_here"

# 3. JWT Secret (Used for Admin Portal sessions)
JWT_SECRET_KEY="your_secure_random_string_here"
```

---

## 2. Backend Setup (Next.js)

The backend uses **Vercel AI SDK**, **pgvector** for RAG, and **Xenova Transformers** (for fast, local embedding of text chunks without an external API).

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
2. **Initialize the Database:**
   This script will automatically enable the `vector` extension, create the necessary tables (`admin_users` and `document_chunks`), and insert the default admin user account (Username: `admin`, Password: `admin`).
   ```bash
   npm run init-db
   ```
3. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will now be running on `http://localhost:8000`.*

---

## 3. Frontend Setup (Vite + React)

The frontend is a Vite app. It connects to the Next.js backend on port 8000.

1. Open a new terminal and navigate to the frontend:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```

* **Kiosk Display:** `http://localhost:5173`
* **Admin Portal:** `http://localhost:5173/admin`

---

## What Changed?

* **Next.js Backend:** The complete backend architecture (FastAPI/Python) was replaced with Next.js API routes (`backend/src/app/api`).
* **Vercel AI SDK & OpenRouter:** Replaced local Ollama execution with `pgvector` RAG tools called directly by the OpenRouter `meta/muse-spark-1.3` model.
* **Admin Portal UI:** Removed the scrollbar when logged in (`overflow: hidden`).
* **Multiple Image Uploads:** The `EventEditor` now allows selecting multiple images.
* **Slideshow Display:** `EventBanner.tsx` displays the 1st image for 3 seconds, transitions to the next, and seamlessly loops back to the first in a continuous circular loop.
* **Vectorizing MD files:** The `knowledge_base/*.md` files are chunked and converted into vectors using the `Xenova/all-MiniLM-L6-v2` embedding model before being stored in PostgreSQL.
