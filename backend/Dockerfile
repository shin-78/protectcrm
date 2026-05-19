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

# Copy start script
COPY start.sh ./
RUN chmod +x start.sh

# Build TypeScript code
RUN npm run build

# Run migrations then start server via script
CMD ["sh", "start.sh"]
