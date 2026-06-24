# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for librosa, audio processing, and health checks
RUN apt-get update && apt-get install -y \
    build-essential \
    libasound2-dev \
    libsndfile1-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Ensure the assets directory exists (will be mounted as a volume in docker-compose)
RUN mkdir -p /app/assets

# Expose the port that the app runs on
EXPOSE 8000

# Define environment variables
ENV PYTHONUNBUFFERED=1

# Health check (also used by docker-compose condition: service_healthy)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
