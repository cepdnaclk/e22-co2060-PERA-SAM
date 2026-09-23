# PERA-SAM Developer Guide

> **Predictive Equipment Reliability & Acoustics — Sound Analysis Manager**
>
> A comprehensive guide for developers contributing to the PERA-SAM project.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
  - [1. Web Dashboard (pera-sam)](#1-web-dashboard-pera-sam)
  - [2. Mobile App (pera-sam-mobile)](#2-mobile-app-pera-sam-mobile)
  - [3. ML Backend (Model/server)](#3-ml-backend-modelserver)
- [Environment Variables](#environment-variables)
- [Database & Supabase](#database--supabase)
- [API Reference](#api-reference)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Branching Strategy & Git Workflow](#branching-strategy--git-workflow)
- [Code Style & Conventions](#code-style--conventions)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

PERA-SAM is an AI-powered acoustic management system that detects machine health anomalies by analyzing sound signatures. It consists of **three sub-projects** that work together:

| Component | Description | Port |
|-----------|-------------|------|
| **Web Dashboard** (`pera-sam/`) | React SPA for users to upload audio, view results, manage requests | `:8080` |
| **Mobile App** (`pera-sam-mobile/`) | React Native (Expo) companion app with the same core features | Expo Dev |
| **ML Backend** (`Model/server/`) | FastAPI server for autoencoder-based sound anomaly detection | `:8000` |

Supporting directories:

| Directory | Purpose |
|-----------|---------|
| `mimii_baseline/` | Original Hitachi MIMII research code & raw dataset storage |
| `docs/` | GitHub Pages documentation site |
| `.github/workflows/` | CI/CD pipeline configurations |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                               │
│                                                                    │ 
│   ┌──────────────────────┐      ┌──────────────────────────────┐   │
│   │   pera-sam (Web)     │      │   pera-sam-mobile (Mobile)   │   │
│   │   React + Vite       │      │   React Native + Expo        │   │
│   │   TypeScript         │      │   TypeScript                 │   │
│   │   TailwindCSS        │      │   Expo Router                │   │
│   │   Radix UI           │      │   React Navigation           │   │
│   └──────────┬───────────┘      └────────────┬─────────────────┘   │
│              │                               │                     │
└──────────────┼───────────────────────────────┼─────────────────────┘
               │    REST API (:8000)           │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                                 │
│                                                                     │
│   ┌──────────────────────┐      ┌──────────────────────────────┐    │
│   │   Model/server       │      │   Supabase Cloud             │    │
│   │   FastAPI + TF/Keras │      │   Auth (JWT)                 │    │
│   │   Librosa + NumPy    │      │   PostgreSQL Database        │    │
│   │   Anomaly Detection  │      │   Row Level Security (RLS)   │    │
│   └──────────────────────┘      └──────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User** opens the web/mobile app → authenticates via **Supabase Auth** (JWT)
2. **User** uploads a `.wav` audio file on the Analysis page
3. **Frontend** sends `POST /analyze` to the **ML Backend**
4. **Backend** preprocesses audio → runs autoencoder inference → returns health score
5. **Frontend** displays the result (Normal / Warning / Anomaly) with recommendations

---

## Repository Structure

```
e22-co2060-PERA-SAM/
│
├── pera-sam/                      #  Web Dashboard
│   ├── src/
│   │   ├── App.tsx                # Root app with React Router
│   │   ├── main.tsx               # Vite entry point
│   │   ├── pages/                 # Route pages
│   │   │   ├── LandingPage.tsx    # Public landing page
│   │   │   ├── LoginPage.tsx      # Authentication
│   │   │   ├── RegisterPage.tsx   # User registration
│   │   │   └── dashboard/         # Protected dashboard pages
│   │   │       ├── DashboardHome.tsx
│   │   │       ├── AnalysisPage.tsx
│   │   │       ├── HistoryPage.tsx
│   │   │       ├── RequestsPage.tsx
│   │   │       ├── AppointmentsPage.tsx
│   │   │       ├── MapPage.tsx
│   │   │       ├── SettingsPage.tsx
│   │   │       └── AboutPage.tsx
│   │   ├── components/            # Reusable UI components
│   │   │   ├── ui/                # Radix/shadcn primitives
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── RequestChatDialog.tsx
│   │   │   ├── RequestRepairModal.tsx
│   │   │   └── ...
│   │   ├── lib/                   # Utilities & context
│   │   │   ├── auth-context.tsx   # Auth provider (Supabase)
│   │   │   ├── appointment-utils.ts
│   │   │   ├── status-helpers.ts
│   │   │   └── utils.ts
│   │   ├── integrations/
│   │   │   └── supabase/
│   │   │       ├── client.ts      # Supabase client init
│   │   │       └── types.ts       # Generated DB types
│   │   └── test/                  # Vitest test files
│   ├── backend/                   # Duplicate ML server (for Docker context)
│   ├── supabase/
│   │   └── migrations/            # SQL migration files
│   ├── Dockerfile                 # Multi-stage build (Node → Nginx)
│   ├── docker-compose.yml         # Full stack orchestration
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
├── pera-sam-mobile/               #  Mobile App
│   ├── src/
│   │   ├── app/                   # Expo Router file-based routing
│   │   │   ├── _layout.tsx        # Root layout
│   │   │   ├── index.tsx          # Login screen
│   │   │   ├── register.tsx
│   │   │   ├── welcome.tsx
│   │   │   ├── chat.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── reset-password.tsx
│   │   │   └── (tabs)/           # Bottom tab navigation
│   │   │       ├── _layout.tsx
│   │   │       ├── dashboard.tsx
│   │   │       ├── analysis.tsx
│   │   │       ├── history.tsx
│   │   │       ├── requests.tsx
│   │   │       ├── appointments.tsx
│   │   │       ├── map.tsx
│   │   │       └── profile.tsx
│   │   ├── components/            # Shared UI components
│   │   ├── constants/             # Theme tokens
│   │   ├── hooks/                 # Custom hooks
│   │   └── lib/                   # Supabase, ML API, utilities
│   │       ├── AuthContext.tsx
│   │       ├── ThemeContext.tsx
│   │       ├── supabase.ts
│   │       ├── mlApi.ts
│   │       ├── profileApi.ts
│   │       └── appointmentUtils.ts
│   ├── assets/                    # Images and static assets
│   ├── eas.json                   # Expo Application Services config
│   ├── app.json                   # Expo app configuration
│   ├── package.json
│   └── .env.example
│
├── Model/                         #  ML Backend
│   ├── server/
│   │   ├── main.py                # FastAPI entry point
│   │   ├── trainer.py             # Autoencoder training pipeline
│   │   ├── inference.py           # Sound analysis engine
│   │   ├── config.yaml            # Paths, hyperparameters, server config
│   │   ├── requirements.txt       # Python dependencies
│   │   ├── Dockerfile
│   │   ├── assets/                # Trained .h5 models + metrics.yaml
│   │   ├── _test_unified.py       # Integration tests
│   │   └── _test_autodetect.py    # Auto-detection tests
│   ├── start_server.bat           # Windows one-click launcher
│   └── cloud_trainer.ipynb        # Google Colab training notebook
│
├── mimii_baseline/                #  Research Dataset
│   ├── baseline.py                # Original Hitachi MIMII code
│   ├── baseline.yaml              # Original config
│   ├── dataset/                   # MIMII .wav files (not committed)
│   └── pickle/                    # Cached feature vectors
│
├── docs/                          #  GitHub Pages site
│   ├── README.md
│   ├── _config.yml
│   ├── documentation/
│   ├── images/
│   └── data/
│
├── .github/workflows/             #  CI/CD
│   ├── azure-static-web-apps-proud-glacier-05c9fb600.yml
│   └── wiki.yml
│
├── README.md
├── CONTRIBUTING.md
├── DEVELOPER_GUIDE.md             # ← You are here
├── LICENSE
└── .gitignore
```

---

## Prerequisites

Ensure the following are installed on your development machine:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | `>= 18.x` | Web & mobile app development |
| **npm** | `>= 9.x` | Package management (ships with Node.js) |
| **Python** | `>= 3.9, < 3.12` | ML backend server |
| **Git** | Latest | Version control |
| **VS Code** | Latest (recommended) | IDE with ESLint, Prettier, Python extensions |

### Optional (for specific workflows)

| Tool | Purpose |
|------|---------|
| **Docker & Docker Compose** | Containerised deployment |
| **Expo CLI** (`npx expo`) | Mobile app development |
| **EAS CLI** (`npx eas-cli`) | Building mobile APKs / app bundles |
| **Supabase CLI** | Database migrations & local dev |

---

## Environment Setup

### 1. Web Dashboard (`pera-sam`)

```bash
# Clone the repository (if not already)
git clone https://github.com/cepdnaclk/e22-co2060-PERA-SAM.git
cd e22-co2060-PERA-SAM

# Navigate to the web app
cd pera-sam

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Supabase keys (see Environment Variables section)

# Start the development server
npm run dev
```

The dev server starts at **http://localhost:8080** with Hot Module Replacement (HMR).

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 8080) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |

---

### 2. Mobile App (`pera-sam-mobile`)

```bash
cd pera-sam-mobile

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your keys (see Environment Variables section)

# Start Expo development server
npx expo start
```

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --android` | Launch on Android emulator/device |
| `npx expo start --ios` | Launch on iOS simulator |
| `npx expo start --web` | Launch in browser |
| `npm run lint` | Run ESLint via Expo |

#### Building APKs with EAS

```bash
# Development build (internal testing APK)
npx eas-cli build --profile development --platform android

# Preview build (internal distribution APK)
npx eas-cli build --profile preview --platform android

# Production build (Google Play app bundle)
npx eas-cli build --profile production --platform android
```

> **Note:** The `eas.json` file contains build profiles with environment variables already configured for preview and production builds.

---

### 3. ML Backend (`Model/server`)

```bash
cd Model

# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r server/requirements.txt
```

#### Configure the Dataset Path

Edit `server/config.yaml` (or `server/config.yml`):

```yaml
dataset:
  base_directory: ../../mimii_baseline/dataset   # Path to MIMII dataset
  noise_level: 0dB
  pickle_directory: ../../mimii_baseline/pickle
```

#### Start the Server

**Option A — Windows quick start:**
```bash
# Double-click or run:
start_server.bat
```

**Option B — Manual:**
```bash
.venv\Scripts\python.exe server/main.py
```

**Option C — Direct uvicorn:**
```bash
cd server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server starts at **http://localhost:8000**. On first run, it will **automatically train models** if `.h5` files are not found in `assets/`.

---

## Environment Variables

### Web Dashboard (`pera-sam/.env`)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your_anon_key
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# ML Backend API URL
VITE_ML_API_URL=http://localhost:8000

# Google Gemini API Key (for AI photo analysis in repair requests)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> Get Supabase keys from: [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API
>
> Get Gemini API key from: [Google AI Studio](https://aistudio.google.com/apikey)

### Mobile App (`pera-sam-mobile/.env`)

```env
# Supabase Configuration (must use EXPO_PUBLIC_ prefix)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key

# ML Backend API URL
# Physical device: use your computer's local IP (e.g., http://192.168.x.x:8000)
# Android emulator: http://10.0.2.2:8000
# iOS Simulator: http://localhost:8000
EXPO_PUBLIC_ML_API_URL=http://localhost:8000
```

> **Important:** For React Native (Expo), all environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

---

## Database & Supabase

PERA-SAM uses **Supabase** (hosted PostgreSQL) for:

- **Authentication** — Email/password login with JWT tokens
- **User Profiles** — Stored in the `profiles` table
- **Analysis Results** — Historical audio analysis records
- **Repair Requests** — User-submitted maintenance requests with chat messaging
- **Appointments** — Scheduled maintenance appointments

### Database Migrations

SQL migrations are located in `pera-sam/supabase/migrations/` and should be applied in chronological order:

| Migration | Description |
|-----------|-------------|
| `20260123...` | Initial database schema |
| `20260301...` | Create `analysis_results` table |
| `20260305_110000...` | Update `handle_new_user` trigger |
| `20260305_114500...` | Create `repair_requests` table |
| `20260305_123000...` | Ensure public auth providers |
| `20260512...` | Add avatar support to profiles |
| `20260709_000000...` | Create `request_messages` table |
| `20260709_000001...` | Add `is_read` column to messages |
| `20260814...` | Fix profiles RLS and RPC functions |
| `20260922...` | Add appointment scheduling and messages |

#### Applying Migrations

**Via Supabase Dashboard (recommended for cloud):**
1. Go to your Supabase project → **SQL Editor**
2. Paste and run each migration file in order

**Via Supabase CLI (for local development):**
```bash
cd pera-sam
npx supabase db push
```

### Row Level Security (RLS)

All tables have RLS policies enabled. Key rules:
- Users can only read/write their own `profiles` data
- Analysis results are scoped to the authenticated user
- Repair requests are visible to the creator and assigned technicians

---

## API Reference

The ML Backend exposes these endpoints at `http://localhost:8000`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API status, version, loaded model count |
| `GET` | `/health` | Health check (for load balancers / Docker) |
| `GET` | `/models` | Lists all available machine categories and IDs |
| `POST` | `/analyze` | Upload `.wav` file for anomaly detection |

### `POST /analyze`

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `.wav` file |  | Audio file to analyse |
| `category` | `string` |  | Machine type (e.g., `fan`) |
| `machine_id` | `string` |  | Specific machine ID (e.g., `06`). Omit for auto-detect. |

**Example Request:**
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@recording.wav" \
  -F "category=fan"
```

**Example Response:**
```json
{
  "status": "Normal",
  "score": 4.217,
  "threshold_used": 8.35,
  "health_percentage": 93.7,
  "engine_health": "Good",
  "recommendation": "Healthy: Machine operating within normal parameters.",
  "machine_id": "06",
  "machine_category": "fan",
  "model_auc": 0.923,
  "detection_reliability": "High",
  "baseline_compliant": true,
  "model_used": "fan_id_06"
}
```

---

## Docker Deployment

The project includes Docker support for full-stack deployment.

### Full Stack (Frontend + Backend)

```bash
cd pera-sam

# Create a .env file with your Supabase keys
cp .env.example .env
# Edit .env...

# Build and start both services
docker compose up --build
```

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `frontend` | `perasam-frontend` | `8080` | Nginx serving the React SPA |
| `backend` | `perasam-backend` | `8000` | FastAPI ML inference server |

### Backend Only

```bash
cd Model
docker build -t pera-sam-backend ./server
docker run -p 8000:8000 pera-sam-backend
```

### Architecture Notes

- **Frontend** uses a multi-stage Docker build: `node:20-slim` (build) → `nginx:stable-alpine` (serve)
- **Backend** uses `python:3.9-slim` with `libsndfile` for audio processing
- A **named volume** (`model_assets`) persists trained `.h5` models across container restarts
- The backend has a health check with a 60-second start period (for model loading)

---

## CI/CD Pipeline

### Azure Static Web Apps

The web dashboard is automatically deployed to **Azure Static Web Apps** via GitHub Actions.

**Workflow file:** `.github/workflows/azure-static-web-apps-proud-glacier-05c9fb600.yml`

**Triggers:**
- Push to `main` branch → Deploy
- Pull request to `main` → Deploy preview
- PR closed → Clean up preview environment

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PROUD_GLACIER_05C9FB600` | Azure SWA deployment token |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `VITE_ML_API_URL` | Production ML API URL |

### Mobile App (EAS Build)

Mobile builds are triggered manually via the **Expo Application Services (EAS)** CLI:

```bash
cd pera-sam-mobile
npx eas-cli build --profile preview --platform android
```

The production ML API URL is configured in `eas.json` for preview and production builds.

---

## Testing

### Web Dashboard (Vitest)

```bash
cd pera-sam

# Run all tests once
npm run test

# Run in watch mode
npm run test:watch
```

Test files are located in `src/test/`. The project uses:
- **Vitest** as the test runner
- **Testing Library** (`@testing-library/react`) for component testing
- **jsdom** as the test environment

### ML Backend (Python)

```bash
cd Model/server

# Integration test (config + trainer + inference)
python _test_unified.py

# Auto-detection test
python _test_autodetect.py
```

### API Testing

Two test scripts are provided in `pera-sam/`:

```bash
# Node.js API test
node test_api_node.cjs

# Python API test
python test_api.py
```

---

## Branching Strategy & Git Workflow

### Branch Structure

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code; auto-deploys to Azure |
| `<name>-patch-N` | Individual developer feature/fix branches |
| `fixing-ui` | UI-specific fix branches |

### Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b your-name-patch-N
   ```

2. **Make changes** and commit with conventional messages:
   ```bash
   git add .
   git commit -m "feat: add appointment scheduling page"
   ```

3. **Push** your branch:
   ```bash
   git push origin your-name-patch-N
   ```

4. **Open a Pull Request** to `main` on GitHub

5. **Code review** — at least one teammate should review before merging

### Commit Message Convention

Use the following prefixes:

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Code style (formatting, no logic change) |
| `refactor:` | Code refactoring |
| `test:` | Adding or updating tests |
| `chore:` | Build process, tooling changes |

**Examples:**
```
feat: add Escape key shortcut to close notification dropdown
fix: improve NotFound page with animation, path display, and Go Back button
docs: update developer guide with Docker setup instructions
```

---

## Code Style & Conventions

### TypeScript / React (Web & Mobile)

- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS (web), StyleSheet (mobile)
- **UI Components:** Radix UI primitives (web), Expo components (mobile)
- **State Management:** React Context + TanStack React Query
- **Routing:** React Router v6 (web), Expo Router (mobile)
- **Forms:** React Hook Form + Zod validation
- **Linting:** ESLint with React Hooks and React Refresh plugins

### Python (ML Backend)

- **Framework:** FastAPI with Uvicorn
- **ML:** TensorFlow/Keras for autoencoder models
- **Audio:** Librosa for feature extraction
- **Config:** YAML-based configuration
- **Logging:** Python `logging` module → console + `server.log`

### File Naming

| Context | Convention | Example |
|---------|-----------|---------|
| React pages | `PascalCase.tsx` | `DashboardHome.tsx` |
| React components | `PascalCase.tsx` | `RequestChatDialog.tsx` |
| Utilities | `kebab-case.ts` | `appointment-utils.ts` |
| Python modules | `snake_case.py` | `inference.py` |
| SQL migrations | `YYYYMMDDHHMMSS_description.sql` | `20260709000000_create_request_messages.sql` |

### Import Aliases

The web app uses the `@/` alias for `src/`:

```typescript
// Do this
import { Button } from "@/components/ui/button";

// Don't do this
import { Button } from "../../../components/ui/button";
```

---

## Troubleshooting

### Common Issues

#### Web Dashboard

| Issue | Solution |
|-------|----------|
| Blank page on `npm run dev` | Check `.env` file exists with valid Supabase keys |
| `VITE_` env vars undefined | Restart the dev server after editing `.env` |
| Auth not working | Verify Supabase URL and anon key are correct |
| Build fails on Azure | Check all GitHub Secrets are configured |

#### Mobile App

| Issue | Solution |
|-------|----------|
| `EXPO_PUBLIC_` vars undefined | Environment variables must use `EXPO_PUBLIC_` prefix |
| Can't connect to ML API on device | Use your computer's local IP, not `localhost` |
| Android emulator connection | Use `http://10.0.2.2:8000` instead of `localhost` |
| EAS build fails | Run `npx eas-cli whoami` to verify you're logged in |

#### ML Backend

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Ensure the virtual environment is activated |
| Training crashes with OOM | Reduce `batch_size` in `config.yaml` |
| `librosa` import error | Install system dependency: `apt install libsndfile1` |
| Models not found | Set `auto_train: true` in `config.yaml` and provide the MIMII dataset |
| Slow first startup | Normal — initial training takes several minutes |

#### Docker

| Issue | Solution |
|-------|----------|
| Frontend can't reach backend | In Docker, `VITE_ML_API_URL` must be the URL the **browser** can reach (e.g., `http://localhost:8000`), not the Docker service name |
| Backend unhealthy | Check the 60s `start_period` — TF model loading takes time |
| Models lost after restart | Ensure the `model_assets` named volume is configured |

### Getting Help

- **Check the logs:** Backend logs to console and `server/server.log`
- **Supabase Dashboard:** Monitor auth, database, and RLS policies at [supabase.com/dashboard](https://supabase.com/dashboard)
- **Open an issue:** [GitHub Issues](https://github.com/cepdnaclk/e22-co2060-PERA-SAM/issues)

---

## Useful Links

| Resource | URL |
|----------|-----|
| GitHub Repository | https://github.com/cepdnaclk/e22-co2060-PERA-SAM |
| Project Page | https://cepdnaclk.github.io/e22-co2060-PERA-SAM |
| MIMII Dataset | https://zenodo.org/record/3384388 |
| Supabase Docs | https://supabase.com/docs |
| Vite Docs | https://vitejs.dev |
| Expo Docs | https://docs.expo.dev |
| FastAPI Docs | https://fastapi.tiangolo.com |
| TailwindCSS Docs | https://tailwindcss.com/docs |

---

*Developed by **Invictus-Team29** — Faculty of Engineering, University of Peradeniya.*
