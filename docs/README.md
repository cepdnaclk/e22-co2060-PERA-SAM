---
layout: home
permalink: index.html

# Please update this with your repository name and project title
repository-name: e22-co2060-PERA-SAM
title: PERA-SAM (Sound Analysis Manger)
---

[comment]: # "This is the standard layout for the project, but you can clean this and use your own template, and add more information required for your own project"

<!-- Once you fill the index.json file inside /docs/data, please make sure the syntax is correct. (You can use this tool to identify syntax errors)

Please include the "correct" email address of your supervisors. (You can find them from https://people.ce.pdn.ac.lk/ )

Please include an appropriate cover page image ( cover_page.jpg ) and a thumbnail image ( thumbnail.jpg ) in the same folder as the index.json (i.e., /docs/data ). The cover page image must be cropped to 940×352 and the thumbnail image must be cropped to 640×360 . Use https://croppola.com/ for cropping and https://squoosh.app/ to reduce the file size.

If your followed all the given instructions correctly, your repository will be automatically added to the department's project web site (Update daily)

A HTML template integrated with the given GitHub repository templates, based on github.com/cepdnaclk/eYY-project-theme . If you like to remove this default theme and make your own web page, you can remove the file, docs/_config.yml and create the site using HTML. -->

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:3a8296,50:1a5276,100:091519&height=200&text=PERA%20SAM&fontSize=48&fontColor=61DAFB&fontAlignY=35&animation=twinkling&section=header&desc=Computer%20Engineering%20Department%20%7C%20Team%20Invictus&descSize=16&descColor=88C0D0&descAlignY=55" width="100%" />
</p>


## 🩺 AI Sound Analyst & Health Manager for Industrial Assets

---

## Team
-  E/22/184, Karunanayake K.P.B.P. , [email](mailto:e22184@eng.pdn.ac.lk)
-  E/22/396, Thilakarathna M. A. P. P., [email](mailto:e22396@eng.pdn.ac.lk)
-  E/22/188, Kavindya R. M. D. , [email](mailto:e22188@eng.pdn.ac.lk)
-  E/22/336, Sadaruwan D. M. D. , [email](mailto:e22336@eng.pdn.ac.lk)

<!-- Image (photo/drawing of the final hardware) should be here -->

<!-- This is a sample image, to show how to add images to your page. To learn more options, please refer [this](https://projects.ce.pdn.ac.lk/docs/faq/how-to-add-an-image/) -->

<!-- ![Sample Image](./images/sample.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture )
3. [Software Designs](#hardware-and-software-designs)
4. [Testing](#testing)
5. [Conclusion](#conclusion)
6. [Links](#links)

## 📖 Introduction

PERA-SAM (Predictive Equipment Reliability & Acoustics - Sound Analysis Manager) is a centralized acoustic management system designed to listen to the "heartbeat" of machines.

Traditional maintenance is reactive—fixing things only after they break. PERA-SAM shifts this to a predictive model. By processing acoustic signatures using FFT (Fast Fourier Transform) and MFCC, the system detects subtle frequency shifts caused by friction, imbalances, or wear before catastrophic failure occurs.

Currently prototyped for laptop cooling fans, server fans, engine fans, this system is designed to scale up to heavy industrial machinery and vehicle engines.

## Solution Architecture

<img width="978" height="95" alt="image" src="https://github.com/user-attachments/assets/c03a0a87-2f82-4012-aa4e-4578de1de60f" />


| Folder | Role | Tech Stack |
|--------|------|------------|
| `mimii_baseline/` | Original Hitachi research code + raw dataset storage | Python, Keras, librosa |
| `model/server/` | Production ML API — trains models, serves predictions | Python, FastAPI, TensorFlow, uvicorn |
| `pera-sam/` | Web dashboard — user login, upload audio, view results | React, Vite, TypeScript, TailwindCSS, Supabase |

>### Step-by-Step: What happens when run the system
<img width="970" height="959" alt="image" src="https://github.com/user-attachments/assets/59f0e80b-5309-4bbb-b9c6-727026f9b887" />



## 🎨 Software Design

### 1. Frontend Design Patterns (React & TypeScript)
The client application follows a strict **Component-Based Architecture** and utilizes several React-specific design patterns to ensure the UI is maintainable and scalable.

*   **Atomic Design Principles:** UI elements are built using foundational, reusable primitive components (via Radix UI / Shadcn). These atomic components (like buttons and inputs) are combined into more complex organisms (like the `UploadForm` and `DashboardLayout`).
*   **Provider Pattern:** Global state, such as User Authentication and Theme Settings, is injected into the component tree using React Context (`AuthProvider`, `ThemeProvider`). This prevents prop-drilling across deeply nested pages.
*   **Container/Presenter Pattern:** Data fetching and asynchronous state management are completely decoupled from UI rendering using `@tanstack/react-query`. It handles the "Container" logic (caching, loading states, error handling), allowing the UI components to remain pure "Presenters."
*   **Wrapper Components (HOCs):** Security and routing are handled via wrapper components. For example, the `<ProtectedRoute>` component wraps dashboard routes, automatically redirecting unauthenticated users before the route even mounts.

### 2. Backend Design Patterns (Python & FastAPI)
The backend ML API is highly modularized, strictly separating the heavy Machine Learning logic from the HTTP routing layer.

*   **Modular Separation of Concerns:** 
    *   `main.py`: Handles the HTTP lifecycle, API routing, and CORS middleware.
    *   `trainer.py`: Encapsulates all logic for loading datasets, extracting features, and training models.
    *   `inference.py`: Contains the `SoundAnalyzer` logic dedicated purely to predicting anomalies.
*   **Singleton Pattern (Model Loading):** Machine learning models (`.h5` files) are large and slow to load. The `SoundAnalyzer` acts as a Singleton during the FastAPI `lifespan`. Models are loaded into memory *once* at server startup, enabling extremely fast, sub-second responses for subsequent `/analyze` requests.


### 3. API & Machine Learning Design Strategy
*   **Façade Pattern (API):** The `/analyze` API endpoint acts as a Façade. The client simply sends an audio file, completely unaware of the complex pipeline beneath (Librosa Mel-spectrogram extraction, MSE calculation, and threshold comparison).
*   **Dynamic Thresholding:** Rather than hardcoding what constitutes an "anomaly," the system dynamically calculates thresholds based on the 90th percentile of reconstruction errors during training.
*   **Auto-Initialization Strategy:** To ensure a smooth developer experience, the system implements an auto-bootstrap mechanism. If the server boots and detects no trained models, it automatically scans the raw dataset, extracts features, trains the autoencoders, and calibrates thresholds before opening the port for traffic.
<img width="1401" height="481" alt="Untitled Diagram drawio (3)" src="https://github.com/user-attachments/assets/21f29925-884b-457f-b2fd-d5f1cd1b95ba" />








## Testing
The PERA-SAM application employs a comprehensive, multi-layered testing architecture to ensure reliability across the frontend, backend, and API integrations. Our approach separates testing into distinct areas to maintain code quality without disrupting the production structure.
### Testing Overview
| Testing Phase | Framework/Tool | Target Scope | Execution / Location | Primary Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Testing** | Pytest + httpx | FastAPI Backend | `python -m pytest tests/ -v` (in `model/`) | API logic, validation errors, and Python integration via `TestClient`. |
| **Frontend Unit** | Vitest | React Utilities | `npm run test` (in root) | Isolated testing of pure utility functions, hooks, and uncoupled logic. |
| **Frontend Integration**| React Testing Library | UI Components | `npm run test` (in root) | DOM rendering, component interactions, and simulated user workflows. |
| **API Endpoints** | Postman | Live Server | Postman Runner | Automated post-request assertions (status codes, timings, payloads). |
### Backend Testing (Pytest + FastAPI)
The standard and most robust way to test the FastAPI backend is using `pytest` combined with `httpx` (using FastAPI's `TestClient`). This tests the API logic without needing a running server.
* **Execution:** Navigate to the `model/` directory and run `python -m pytest tests/ -v`.
* **Scope:** Tests logic, validation errors (e.g., handling missing file uploads), and python integration.

### Frontend Unit Testing (Vitest)
Vitest is configured for the frontend to handle pure utility functions, hooks, and logic uncoupled from the React UI.
* **Execution:** Run `npm run test` or `npm run test:watch` in the frontend directory.
* **Scope:** Tests standalone helper functions (e.g., formatting confidence scores) alongside the files they test (e.g., `utils.ts` -> `utils.test.ts`).

### Frontend Integration Testing (React Testing Library)
Integration tests ensure that React components render correctly, interact with each other properly, and handle user events as expected.
* **Execution:** Included in the standard `npm run test` command via jsdom environment.
* **Scope:** Tests DOM rendering, simulated user workflows, and state changes (e.g., file upload component behavior and error messages).

### API Endpoints Unit Testing (Postman)
Postman allows writing JavaScript assertions that run after an API request completes, making it ideal for automating API endpoint testing.
* **Execution:** Import the `PERA-SAM API Tests` collection into Postman, set the `base_url` environment variable (e.g., `http://localhost:8000`), and run the collection.
* **Scope:** End-to-end integration test from the client's perspective to a live server, validating status codes, response times, and correct JSON payloads.









## Conclusion
**PERA-SAM** represents a significant shift in industrial maintenance—moving away from reactive repairs to intelligent, proactive monitoring. By successfully leveraging acoustic signatures and machine learning (Autoencoders, FFT, and MFCC), this system proves that we can accurately detect the subtle early warning signs of equipment degradation before a catastrophic failure occurs.
While currently prototyped and validated on cooling fans and small-scale motors, the architecture is inherently scalable. The ultimate vision for PERA-SAM is to be deployed across heavy manufacturing facilities, automotive fleets, and large-scale industrial plants—serving as the continuous, automated "ears" for mission-critical infrastructure, reducing unexpected downtime, and saving significant maintenance costs.



## Links

- [Project Repository](https://github.com/cepdnaclk/e22-co2060-PERA-SAM)
- [Project Page](https://cepdnaclk.github.io/e22-co2060-PERA-SAM)
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)

[//]: # (Please refer this to learn more about Markdown syntax)
[//]: # (https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
