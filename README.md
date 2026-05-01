<p algin ="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:3a8296,100:091519&height=150&text=PERA%20-SAM%20🎧🔧&fontSize=50&fontColor=61DAFB&fontAlignY=30&animation=twinkling&section=header" />
</p>

# AI Sound Analyst & Health Manager for Industrial Assets

![Python](https://img.shields.io/badge/Python-3.9%2B-blue) ![Librosa](https://img.shields.io/badge/Audio_Analysis-Librosa-orange) ![Status](https://img.shields.io/badge/Status-Prototype-green)

> ## 📖 Overview
**PERA-SAM** (Predictive Equipment Reliability & Acoustics - Sound Analysis Manager) is a centralized acoustic management system designed to listen to the "heartbeat" of machines. 

Traditional maintenance is reactive—fixing things only after they break. PERA-SAM shifts this to a **predictive** model. By processing acoustic signatures using FFT (Fast Fourier Transform) and MFCC, the system detects subtle frequency shifts caused by friction, imbalances, or wear *before* catastrophic failure occurs.

Currently prototyped for **laptop cooling fans, server fans, engine fans**, this system is designed to scale up to heavy industrial machinery and vehicle engines.

> ## 🚀 Key Features
* **🩺 AI Sound Doctor:** Captures audio to generate a real-time "Health Score" for assets.
* **🔮 Predictive Maintenance:** Estimates Remaining Useful Life (RUL) to prevent unexpected downtime.
* **🧠 Self-Learning (Human-in-the-Loop):** A feedback mechanism where technicians validate AI predictions to constantly improve model accuracy.
* **📊 Fleet Dashboard:** A web-based portal (Flask/Django) to manage diverse assets, from small electronics to heavy vehicles.

> ## 🛠️ Tech Stack
* **Core Logic:** Python
* **DSP & Audio:** Librosa, NumPy (FFT/MFCC extraction)
* **Machine Learning:** Scikit-Learn (Anomaly Detection)
* **Backend/UI:** Flask / Django
* **Database:** SQLite / PostgreSQL

> ## 1. System Architecture Overview

```mermaid
graph LR
    A["mimii_baseline<br/>(Research Lab)"] -->|"dataset + pickle"| B["Model/server<br/>(ML Backend API)"]
    B -->|"REST API :8000"| C["pera-sam<br/>(Frontend Web App)"]
    C -->|"Supabase Auth"| D["Supabase Cloud<br/>(User DB + Auth)"]
```
| Folder | Role | Tech Stack |
|--------|------|------------|
| `mimii_baseline/` | Original Hitachi research code + raw dataset storage | Python, Keras, librosa |
| `Model/server/` | Production ML API — trains models, serves predictions | Python, FastAPI, TensorFlow, uvicorn |
| `pera-sam/` | Web dashboard — user login, upload audio, view results | React, Vite, TypeScript, TailwindCSS, Supabase |


> ## 2. Complete System Workflow

### Step-by-Step: What happens when you run the system

```mermaid
sequenceDiagram
    participant User
    participant Frontend as pera-sam<br/>(React :5173)
    participant Backend as Model/server<br/>(FastAPI :8000)
    participant Dataset as mimii_baseline/<br/>dataset/
    participant Supabase as Supabase Cloud

    Note over Backend: SERVER STARTUP
    Backend->>Dataset: 1. Scan dataset folder for machine IDs
    Backend->>Backend: 2. Check if .h5 models exist in assets/
    alt Models missing
        Backend->>Dataset: 3. Read normal/*.wav files
        Backend->>Backend: 4. Extract mel-spectrograms → pickle cache
        Backend->>Backend: 5. Train autoencoder (50 epochs)
        Backend->>Backend: 6. Calibrate threshold (normal vs abnormal)
        Backend->>Backend: 7. Save model.h5 + metrics.yaml → assets/
    end
    Backend->>Backend: 8. Load all .h5 models into memory

    Note over User: USER INTERACTION
    User->>Frontend: 9. Open browser → Landing Page
    Frontend->>Supabase: 10. Login / Register (auth)
    Supabase-->>Frontend: JWT token
    User->>Frontend: 11. Go to Analysis page → upload .wav
    Frontend->>Backend: 12. POST /analyze (audio file)
    Backend->>Backend: 13. Preprocess audio → mel-spectrogram
    Backend->>Backend: 14. Auto-detect machine ID (lowest MSE)
    Backend->>Backend: 15. Compare score vs calibrated threshold
    Backend-->>Frontend: 16. JSON result (Normal/Warning/Anomaly)
    Frontend->>User: 17. Display health score, recommendation
```

---
*Developed by [Invictus-Team29] - Faculty of Engineering, University of Peradeniya.*

<p align="center">
     <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=100&section=footer"/>
</p>
