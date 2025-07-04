#!/bin/bash

echo "🚀 Starting FlyNext services..."

# Step 1: Build and start containers
echo "📦 Building and starting containers..."
docker-compose up -d --build

# Step 2: Wait for services to initialize
echo "⏳ Waiting for services to be ready..."
sleep 1  # Increased wait time to ensure PostgreSQL is fully ready

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec web npx prisma generate

# Step 4: Apply migrations
echo "📦 Running migrations..."
docker-compose exec web npx prisma migrate deploy

# Step 5: Restart web service to ensure Prisma client is loaded
echo "🔄 Restarting web service..."
docker-compose restart web

# Step 6: Wait for web service to restart
echo "⏳ Waiting for web service to restart..."
sleep 1

# ✅ Step 7 & 8 combined: Run import-data.sh
echo "📥 Importing hotel data using import-data.sh..."
./import-data.sh

echo "✅ Setup complete! Access the app at: http://localhost:80"
