# API image: slim Python + LiteRT (no TensorFlow). VGGish is downloaded at build time, pinned by checksum.
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:0.11.21 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml .
RUN uv pip install --system --no-cache -r pyproject.toml
ADD --chmod=644 --checksum=sha256:2de04c6dc3678354c421d24be7513bac593a7f3d1703da8cdf7cd65c716b8d08 \
    https://github.com/krogdorlok/Myuzik_Web/releases/download/vggish-v1/vggish.tflite models/vggish.tflite
COPY alembic.ini .
COPY alembic alembic
COPY app app
RUN useradd --system --uid 10001 app
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --ws-max-size 65536 --proxy-headers --forwarded-allow-ips='*'"]
