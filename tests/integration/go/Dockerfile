FROM golang:1.22-alpine

WORKDIR /app
COPY go/ /app/go/
WORKDIR /app/tests/integration/go
COPY tests/integration/go/ .

CMD ["go", "test", "-tags=integration", "-v"]
