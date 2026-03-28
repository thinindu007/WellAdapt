# WellAdapt Backend

**Secure API Gateway and AI Orchestration Server**

This is the Node.js (TypeScript) backend for the WellAdapt platform. It acts as the central controller, managing user authentication, database persistence, and the orchestration of multiple AI models for emotion detection and counseling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | Express.js with TypeScript |
| Database | PostgreSQL (relational storage for users and chat history) |
| Security | JWT (JSON Web Tokens) and bcrypt (password hashing) |
| PDF Engine | `pdfkit` (for generating clinical wellness summaries) |
| AI Integration | Axios (communication with FastAPI and Ollama/LLaMA 3) |

---

## Core Functionalities

**Dual-Model Orchestration** — Routes English inputs to a CNN-LSTM model (FastAPI) for high-accuracy emotion detection, and routes both English and Sinhala inputs to LLaMA 3 (Ollama) for empathetic response generation.

**Backend Safety Interceptor** — A redundant fail-safe layer that uses regex-based keyword matching to detect crisis situations independently of the AI models.

**Session Persistence** — Full CRUD operations for chat sessions, allowing students to maintain a continuous counseling history across interactions.

**Automated Reporting** — Aggregates 30-day user data and triggers LLaMA 3 to generate an executive Stress Trigger summary, exported as a PDF.

---

## Setup and Installation

### Prerequisites

- Node.js (LTS)
- PostgreSQL

### 1. Database Setup

Ensure PostgreSQL is installed and create a database named `welladapt`:

```sql
CREATE DATABASE welladapt;
```

Run the required migrations to create the `users` and `chat_history` tables.

### 2. Installation

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root of the backend directory:

```env
PORT=5000
DB_USER=your_pg_user
DB_PASSWORD=your_pg_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=welladapt
JWT_SECRET=your_super_secret_key

# AI Server Endpoints
ML_SERVER_URL=http://localhost:8000/predict/english
OLLAMA_URL=http://localhost:11434/api/generate
```

### 4. Running the Server

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## Project Structure

```
src/
├── config/          # Database connection (pg pool)
├── controllers/     # Business logic (chat, auth, reports)
├── middleware/      # Auth guard (JWT) and error handling
├── routes/          # Express route definitions
├── types/           # TypeScript interfaces
└── server.ts        # Entry point
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | User onboarding with language preference |
| `POST` | `/api/auth/login` | Secure login and JWT issuance |
| `POST` | `/api/chat` | Main AI chat flow (Interceptor → ML → LLM) |
| `GET` | `/api/chat/sessions` | Fetch list of previous chat sessions |
| `GET` | `/api/chat/export-report` | Generate and stream the Wellness PDF |

---

## Security and Ethical Compliance

**Data Isolation** — The `userId` extracted from the JWT payload is used to enforce strict data boundaries, ensuring users can only access their own chat history.

**Bilingual Safety Layer** — The backend interceptor is hardcoded with high-risk crisis keywords in both English and Sinhala, providing a language-aware safety net that operates independently of the AI pipeline.

**Clinical Disclaimer** — All generated PDF reports include a mandatory disclaimer clarifying that WellAdapt is a supplementary support tool and is not a substitute for professional medical or psychological care.