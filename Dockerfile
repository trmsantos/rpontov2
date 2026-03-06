# ─────────────────────────────────────────
# Stage 1: Build do Frontend (webpack)
# ─────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package.json ./
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8 --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Backend Django
# ─────────────────────────────────────────
FROM python:3.11-slim AS backend

WORKDIR /api

# ── Dependências de sistema ──────────────────────────────────────
# Inclui tudo o que os pacotes Python precisam para compilar:
#   - mysqlclient      → default-libmysqlclient-dev
#   - psycopg2         → libpq-dev
#   - pyodbc           → unixodbc-dev
#   - xhtml2pdf/lxml   → libxml2-dev, libxslt1-dev
#   - Pillow/reportlab → libjpeg-dev, zlib1g-dev, libfreetype6-dev
#   - dlib             → cmake, libboost-all-dev, libopenblas-dev
#   - face-recognition → (depende do dlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # MySQL
    default-libmysqlclient-dev \
    # PostgreSQL
    libpq-dev \
    # ODBC (pyodbc)
    unixodbc-dev \
    # XML/XSLT (lxml, xhtml2pdf)
    libxml2-dev \
    libxslt1-dev \
    # Imagem (Pillow, reportlab)
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    libpng-dev \
    # dlib / face-recognition
    cmake \
    libboost-all-dev \
    libopenblas-dev \
    liblapack-dev \
    # Compilação geral
    gcc \
    g++ \
    pkg-config \
    curl \
    # Git (necessário para alguns pip installs)
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Instala dependências Python ─────────────────────────────────
# Usa requirementsv2.txt (com versões fixas) que é mais estável
COPY requirements2.0.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements2.0.txt && \
    pip install --no-cache-dir gunicorn

# ── Copia código da aplicação ────────────────────────────────────
COPY . .

# ── Copia os assets do webpack (Stage 1) ────────────────────────
# Static files (JS, CSS, etc.)
COPY --from=frontend-builder /build/frontend/static/ ./frontend/static/
# Template HTML gerado pelo webpack
COPY --from=frontend-builder /build/frontend/templates/ ./frontend/templates/

# ── Diretórios necessários ───────────────────────────────────────
RUN mkdir -p /api/media /api/staticfiles

# ── Entrypoint ───────────────────────────────────────────────────
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]