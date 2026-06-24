# PERA-SAM: Acoustic Intelligence for Mechanical Diagnostics

PERA-SAM is a professional machine learning-powered acoustic analysis platform designed for mechanical diagnostics. It leverages sound analysis to identify anomalies in machinery and equipment.

## Features

- **Sound Analysis**: AI-powered diagnostics of mechanical sounds.
- **Service Map**: Real-time location-based search for certified service providers.
- **Dashboard**: Holistic view of analysis history and machine health.
- **Reporting**: Professional PDF reports for mechanical health checks.

## Technology Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI, Python, TensorFlow, Librosa.
- **Database**: Supabase.
- **Mapping**: Leaflet, React-Leaflet.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Docker (Optional, for containerized deployment)

### Local Development

1. **Clone the repository**:
   ```sh
   git clone <repository-url>
   cd pera-sam
   ```

2. **Frontend Setup**:
   ```sh
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   Navigate to the `Model/server` directory and install dependencies:
   ```sh
   cd ../model/server
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## Docker Deployment

To run both frontend and backend using Docker:

```sh
docker-compose up --build
```

The frontend will be available at `http://localhost:8080` and the backend at `http://localhost:8000`.

## License

All rights reserved. Professional use only. Copyright (c) 2026 Team Invictus.
