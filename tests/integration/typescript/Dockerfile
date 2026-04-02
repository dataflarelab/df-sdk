FROM node:20-slim

WORKDIR /app
COPY typescript/ /app/typescript/
RUN cd /app/typescript && npm install && npm run build

WORKDIR /app/tests/integration/typescript
COPY tests/integration/typescript/ .

CMD ["npm", "test"]
