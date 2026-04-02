FROM python:3.11-slim

WORKDIR /app
COPY python/ /app/python/
RUN pip install ./python[dev,otel]

WORKDIR /app/tests/integration/python
COPY tests/integration/python/ .

CMD ["pytest", "-v"]
