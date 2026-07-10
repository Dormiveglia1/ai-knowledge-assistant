# 1. Pull an official lightweight Python runtime environment as the base layer
FROM python:3.11-slim

# 2. Set the organizational working directory inside the virtual container
WORKDIR /app

# 3. Install Debian-level compiler tools required for compiling C-extensions (like bcrypt / numpy)
#    Then clean up apt caches instantly to keep the final image ultra-slim.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. Optimize network caching: Copy only the requirements list first
COPY requirements.txt .

# 5. Ingest and install all your specified Python components inside the container isolation
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the backend source files into the virtual container disk
COPY . .

# 7. Open port 8000 to accept incoming front-end traffic handshakes
EXPOSE 8000

# 8. Boot up the production Uvicorn orchestration engine when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]