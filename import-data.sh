#!/bin/bash
docker-compose exec web npx tsx scripts/generate-hotels.ts
docker-compose exec web npx tsx scripts/import-hotels.ts