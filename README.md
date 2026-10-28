# RepoMedic AI — Your AI-Powered Open-Source Code Doctor

> **"Your Codebase. Understood."**  
> RepoMedic AI helps developers understand, analyze, debug, and contribute to unfamiliar open-source GitHub repositories using real source-code retrieval and open-weight AI models.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/frontend-React%2019-61DAFB.svg)](https://react.dev/)
[![Ollama](https://img.shields.io/badge/AI-Ollama%20%2F%20Qwen2.5--Coder-orange.svg)](https://ollama.com/)

---

## 1. Problem Statement

Navigating an unfamiliar open-source codebase is intimidating. Developers, students, and open-source contributors spend hours trying to figure out:
- What does this project actually do, and how is it structured?
- Where is a specific feature or authentication workflow implemented?
- What caused this cryptic error or stack trace?
- Which files should a newcomer read first, and how are tests run?

Existing generic AI chat tools hallucinate file names, guess nonexistent functions, or demand that entire codebases be pasted into third-party cloud services. **RepoMedic AI** solves this by providing a local, privacy-first, retrieval-grounded developer workspace that works directly with real GitHub repositories and open-weight AI models.

---

## 2. Features

- **Repository Intelligence**: Accepts public GitHub URLs (e.g., `https://github.com/owner/repository`). Automatically retrieves the file tree, parses AST symbols, detects primary languages, discovers frameworks (FastAPI, React, Express, Flask, etc.), and flags structural risks under safety boundaries.
- **Searchable File Explorer & Source Viewer**: Search and filter repository files by path, name, or language. View syntax-highlighted code with line numbers, copy options, and download capabilities.
- **Ask Your Codebase (RAG)**: Ask natural language questions ("Where is authentication implemented?", "How does request routing work?"). Queries are answered strictly with citations to retrieved code snippets, line ranges, and files.
- **AI Bug Detective**: Submit error messages and stack traces. RepoMedic parses frames from Python, Node.js, and Go, correlates them with indexed source files, and produces a structured diagnosis detailing root causes, evidence, and verification steps.
- **Context-Aware Fix Suggestions (Diff Viewer)**: Inspect proposed patches using unified or side-by-side diff viewers with color-coded additions and deletions. Review potential side effects, testing recommendations, and download `.patch` files. Never mutates your repository automatically.
- **Contributor Assistant**: An onboarding roadmap for newcomers featuring project purpose, high-level architecture, directory breakdowns, entry-point file maps, API route lists, and verified build commands extracted from repository documentation.
- **Persistent Analysis History**: Local SQLite database storage (`repomedic.db`) allowing developers to reopen past analyses, track indexed statistics, or delete history at any time.
- **Local Open-Weight AI (Ollama)**: Integrates seamlessly with Ollama (`qwen2.5-coder:1.5b` or custom models). If Ollama is offline or the model is not yet pulled, RepoMedic gracefully switches to deterministic code-grounded extraction without crashing or fabricating results.

---

## 3. Screenshots

```
+----------------------------------------------------------------------------------------------------+
|  [RepoMedic AI Logo]   Repository: pallets/flask (Python)              [qwen2.5-coder:1.5b Ready]   |
+----------------------------------------------------------------------------------------------------+
|  * Overview            |  Pallets / Flask                       [Stars: 68,000] [Branch: main]     |
|  * Ask Codebase        |  -----------------------------------------------------------------------  |
|  * Bug Detective       |  [File Explorer]                      |  [Source Code Viewer]             |
|  * Contributor Guide   |  - src/flask/app.py                   |  class Flask(Scaffold):           |
|  * Analysis History    |  - src/flask/blueprints.py            |      def wsgi_app(...):           |
|  * Settings            |  - tests/test_basic.py                |          ...                      |
+----------------------------------------------------------------------------------------------------+
```
*(Live interface screenshots can be added here upon deployment)*

---

## 4. Architecture and Technology Stack

### Technology Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React icons.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy, aiosqlite.
- **AI & Retrieval**: Ollama (`qwen2.5-coder:1.5b`), Python AST parser, multi-language structural regexes, BM25 / TF-IDF hybrid retriever.
- **Database**: SQLite async store (`repomedic.db`).
- **Testing**: Pytest, pytest-asyncio, HTTPX.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture diagrams and component specifications.

---

## 5. Prerequisites

- **Python**: Version 3.11 or later
- **Node.js**: Version 18 or later (Node 20+ recommended)
- **Git**: Installed and available in PATH
- **Ollama (Optional, for local AI generation)**: Download from [https://ollama.com](https://ollama.com)

---

## 6. Installation & Startup Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/repomedic-ai/repomedic-ai.git
cd repomedic-ai
```

### Step 2: Backend Setup
```bash
# Navigate to backend directory or stay in root
pip install -r backend/requirements.txt

# Create .env from example template (if not already present)
cp backend/.env.example backend/.env

# Start the FastAPI server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API will start at `http://127.0.0.1:8000`.  
Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### Step 3: Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 7. Ollama Open-Weight Model Setup

RepoMedic AI connects to local open-weight coding models via Ollama.

1. **Install and run Ollama**:
   Download Ollama from [https://ollama.com/download](https://ollama.com/download) and start the application.

2. **Pull the Recommended Model**:
   ```bash
   ollama pull qwen2.5-coder:1.5b
   ```
   *(Or any larger model such as `qwen2.5-coder:7b` if you have a dedicated GPU)*.

3. **Verify Connectivity**:
   Visit the **Settings** page in RepoMedic AI and click **"Test Connectivity"**. If Ollama is offline or the model is not yet pulled, RepoMedic automatically operates in deterministic code-analysis mode, providing grounded snippets and exact AST evidence.

---

## 8. Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `GITHUB_TOKEN` | `""` | Optional personal access token (increases rate limit to 5000 req/hr) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL of the local Ollama server |
| `OLLAMA_MODEL` | `qwen2.5-coder:1.5b` | Ollama model identifier |
| `MAX_REPOSITORY_FILES` | `500` | Safety limit: maximum number of source files to index |
| `MAX_FILE_SIZE_KB` | `500` | Safety limit: maximum file size (KB) |
| `MAX_TOTAL_CONTENT_MB`| `20` | Safety limit: maximum total repository content (MB) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./repomedic.db` | Async SQLite database connection URL |
| `HOST` | `127.0.0.1` | Backend host |
| `PORT` | `8000` | Backend port |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | CORS allowed origins |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Target URL of the backend API |

---

## 9. Docker Compose Deployment

Run the entire stack with Docker Compose:
```bash
docker-compose up --build
```
This launches:
- `repomedic-backend` on port `8000`
- `repomedic-frontend` on port `5173`
- `repomedic-ollama` on port `11434`

---

## 10. Automated Testing

RepoMedic AI includes an automated Pytest test suite testing security, path traversal, AST parsing, retrieval, and API endpoints without external network dependencies.

```bash
# Run backend tests
python -m pytest backend/tests/ -v

# Run frontend build test
cd frontend && npm run build
```

---

## 11. Security Considerations

- **Strict URL Whitelisting**: Only valid `https://github.com/owner/repository` URLs are accepted.
- **Path Traversal Defense**: Prevents directory traversal (`..`, null bytes, absolute paths) when querying indexed files.
- **Sensitive File Exclusion**: `.env*`, `id_rsa`, `*.pem`, `*.key`, and credential files are automatically ignored.
- **Prompt Injection Boundary Defense**: Untrusted repository source code is enclosed in strict boundary tags (`<untrusted_repository_content>`) to defend against instruction override attacks.
- **Non-Destructive Design**: RepoMedic AI never executes untrusted code, mutates files, or automatically pushes commits to Git repositories.

---

## 12. Known Limitations & Future Work

- **GitHub Rate Limits**: Unauthenticated GitHub requests are limited to 60 requests/hour by GitHub. Configuring a `GITHUB_TOKEN` in `backend/.env` expands this limit to 5,000 requests/hour.
- **Private Repositories**: The current release focuses on public GitHub repositories. Support for private repositories via fine-grained OAuth tokens is planned for future releases.
- **Language Coverage**: Python features full AST symbol parsing; other languages use high-precision regex extraction. Full tree-sitter integration for 20+ languages is planned.

---

## 13. License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
