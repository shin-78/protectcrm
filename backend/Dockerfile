FROM node:18-bullseye-slim
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and Prisma schema
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Run migrations then start server
CMD npx prisma migrate resolve --applied 20260518000000_init || true && npx prisma migrate deploy && npm start
