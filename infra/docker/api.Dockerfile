# Backend API Dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY apps/api/pyproject.toml .
RUN pip install --no-cache-dir -e "."

COPY apps/api/ .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
