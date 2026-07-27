# ✨ StudySpark AI Pro

**Study smarter with AI.** Turn any topic into a complete, exam-ready study pack — summary, learning objectives, diagrams, comparison tables, memory tricks, quizzes, viva questions and more — generated instantly by Gemini AI, wrapped in a premium, Apple-grade interface.

Built as a Vibe Coding project (Bharat Cares × IBM masterclass series): AI-native development, cloud deployment, and full-stack engineering in one deliverable.

![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini%20API-2.0%20Flash-8B7CFF)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-App%20Runner-FF9900?logo=amazonaws&logoColor=white)

---

## 🌐 Live Demo

> Paste your deployed AWS App Runner URL here after deployment, e.g.
> `https://studyspark-ai-pro.<region>.awsapprunner.com`

---

## ✨ Features

- **Instant AI study packs** — 13 structured sections per topic: Summary, Learning Objectives, Key Concepts, Visual Explanation (ASCII diagrams), Comparison Table, Memory Tricks, Real-Life Example, Advantages, Disadvantages, Viva Questions, Anna University 16-Mark Notes, Quiz, and References.
- **Premium glassmorphic UI** — blur, gradients, floating cards, smooth motion, dark & light mode, all in hand-written CSS (no UI framework).
- **ChatGPT-style history** — every topic is saved to `localStorage`: pin, rename, delete, search, and instantly reload past notes.
- **Zero-dependency Markdown renderer** — the backend returns Markdown; the frontend renders it into headings, tables, lists, code blocks and quotes without any external library.
- **Export anywhere** — copy to clipboard, download as PDF (print-to-PDF), TXT, or Markdown, or use the Web Share API.
- **Read aloud** — notes read aloud via the browser's Speech Synthesis API.
- **Fully responsive** — desktop, laptop, tablet, and mobile, with a collapsible sidebar on small screens.
- **Secure by design** — the Gemini API key lives only on the server; the frontend never sees it. Simple in-memory rate limiting protects the endpoint from abuse.

---

## 🧱 Tech Stack

| Layer      | Technology                                  |
|------------|----------------------------------------------|
| Frontend   | HTML5, CSS3 (vanilla, glassmorphism), Vanilla JavaScript |
| Backend    | Node.js, Express.js                          |
| AI Model   | Google Gemini API (`gemini-2.0-flash` by default) |
| Container  | Docker (Alpine, multi-user, health-checked)  |
| Deployment | AWS App Runner (or Elastic Beanstalk / ECS)  |

---

## 📁 Project Structure

```
StudySpark-AI-Pro/
├── frontend/
│   ├── index.html          # App shell: nav, sidebar, hero, response feed, modals
│   ├── style.css            # Design system + glassmorphism + animations
│   ├── script.js             # State, API calls, markdown renderer, history, exports
│   └── assets/
├── backend/
│   ├── server.js             # Express app, /api/generate, rate limiting, error handling
│   ├── package.json
│   └── .env.example
├── Dockerfile
├── .dockerignore
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18 or later
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone and install
```bash
cd StudySpark-AI-Pro/backend
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# then edit .env and paste your real GEMINI_API_KEY
```

### 3. Run the server
```bash
npm start
```

The Express server serves both the API **and** the static frontend, so open:

```
http://localhost:8080
```

That's it — no separate frontend build step, no bundler required.

---

## 🔌 API Reference

### `POST /api/generate`
Generates a full study pack for a topic.

**Request body**
```json
{ "topic": "Normalization in DBMS" }
```

**Success response** `200 OK`
```json
{ "markdown": "## 📖 Summary\n...", "topic": "Normalization in DBMS" }
```

**Error responses**
| Status | Meaning |
|--------|---------|
| `400`  | Missing or invalid topic |
| `429`  | Rate limit exceeded (12 requests/minute/IP by default) |
| `500`  | Server misconfiguration (e.g. missing API key) |
| `502`  | Gemini API failed or returned an empty response |

### `GET /api/health`
Lightweight health check used by Docker's `HEALTHCHECK` and load balancers.

---

## 🐳 Docker

Build and run the full stack in a single container:

```bash
docker build -t studyspark-ai-pro .
docker run -p 8080:8080 --env-file backend/.env studyspark-ai-pro
```

Visit `http://localhost:8080`.

The image:
- uses `node:18-alpine` for a small footprint,
- installs only production dependencies,
- runs as a **non-root** user,
- exposes a `/api/health` container health check.

---

## ☁️ Deploying to AWS App Runner

### Option A — Deploy from a container registry (recommended)

1. **Build & push the image to Amazon ECR:**
   ```bash
   aws ecr create-repository --repository-name studyspark-ai-pro
   aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com

   docker build -t studyspark-ai-pro .
   docker tag studyspark-ai-pro:latest <account-id>.dkr.ecr.<your-region>.amazonaws.com/studyspark-ai-pro:latest
   docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/studyspark-ai-pro:latest
   ```

2. **Create the App Runner service:**
   - Open the AWS App Runner console → **Create service**.
   - Source: **Container registry** → **Amazon ECR** → select the image you pushed.
   - Deployment trigger: Manual or Automatic.
   - Port: `8080`.
   - Environment variables: add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under **Configure service → Environment variables**. Never hardcode the key in the image.
   - CPU/Memory: 1 vCPU / 2 GB is comfortable for this workload (Free-tier eligible usage patterns apply — monitor via AWS Budgets).
   - Click **Create & deploy**.

3. App Runner will give you a public HTTPS URL like:
   `https://xxxxxxxxxx.<region>.awsapprunner.com` — paste this into the **Live Demo** section above and your project report.

### Option B — Deploy directly from source

App Runner can also build straight from a GitHub repo using the included `Dockerfile` — connect your repo, select the branch, and App Runner will build and deploy automatically on every push.

### Cost & safety checklist
- [ ] Set up an **AWS Budget alert** (e.g. $5 threshold) before deploying.
- [ ] Use the **smallest instance size** that works (0.25–1 vCPU is enough here).
- [ ] Never commit `.env` or API keys — confirm `.gitignore`/`.dockerignore` exclude them.
- [ ] Rotate your Gemini API key if it is ever exposed.

---

## 🎨 Design Notes

The interface draws from Apple's spatial calm, ChatGPT's conversational rhythm, and Notion/Perplexity's structured density — expressed through a custom **"Spark" gradient** (`#8B7CFF → #4F8DFD`), frosted-glass cards (`backdrop-filter: blur`), an animated gradient mesh background, and a rotating spark mark as the loading indicator. Every AI response is decomposed into individually animated cards rather than a single wall of text, so information is scannable the way a student actually revises.

---

## 🧪 Testing Notes

- Manually verified: topic generation, history CRUD (pin/rename/delete/search), theme + font-size persistence across reloads, PDF/TXT/MD export, speech synthesis start/stop, responsive breakpoints (375px–1440px), and API error states (missing key, rate limit, network failure).
- `GET /api/health` can be used for automated smoke tests in CI/CD.

---

## 📄 License

MIT — free to use, modify, and submit as part of academic coursework with attribution to your own development work as required by your course's academic honesty policy.
