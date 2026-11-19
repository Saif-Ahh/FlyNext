# FlyNext

A travel booking site for flights and hotels, built as a group project with Next.js, Prisma and PostgreSQL. Flight data comes from the AFS (Advanced Flights System) API. Hotels live in our own database, and any user can list their own hotel and manage its rooms and bookings.

## Features

**Flights**
- One-way and round-trip search, with autocomplete for cities and airports
- Booking through AFS, plus viewing and cancelling your bookings
- PDF download for each booking

**Hotels**
- Search by city and dates, with filters for star rating and price range
- Check room availability, book or cancel rooms, and get a PDF confirmation
- Hotel owners can add a hotel, set up room types, change how many rooms are available, and see or cancel bookings at their hotels

**Trips and accounts**
- Itineraries that put a flight and a hotel booking together into one trip, with a checkout page and a PDF summary
- Checkout checks that card details are in a valid format (no real payments go through)
- Sign up and log in with JWT auth, and edit your profile
- Notifications for new bookings and cancellations, for both travellers and hotel owners

## Tech stack

- Next.js 15 (pages router) with API routes as the backend
- React 19, TypeScript, Tailwind
- PostgreSQL with Prisma
- JWT and bcrypt for auth, pdf-lib for the PDFs
- Docker Compose running Postgres, the app, and nginx as a reverse proxy

## Project structure

```
prisma/              schema and migrations
scripts/             generates and imports the hotel seed data
src/
  pages/             frontend pages
  pages/api/         backend routes (auth, flights, bookings, hotels, itineraries, notifications)
  controllers/       logic behind the API routes
  services/          AFS calls and database helpers
  components/        shared React components
  middleware/        auth middleware
Dockerfile, docker-compose.yml, nginx.conf
start.sh, stop.sh, import-data.sh
```

## Running it

You'll need Docker and an AFS API key.

**1. Create a `.env` file in the project root**

```env
DATABASE_URL="postgresql://flynext:flynextpass@postgres:5432/flynextdb"
JWT_SECRET="some-long-random-string"
AFS_API_KEY="your-afs-api-key"
```

The database username, password and name match the ones in `docker-compose.yml`.

**2. Start everything**

```bash
./start.sh
```

This builds the containers, runs the Prisma migrations, then seeds the hotels (made up with Faker for every city AFS has). Once it's done, the site is at http://localhost.

**3. Shut it down**

```bash
./stop.sh
```

Careful, this runs `docker-compose down -v`, which wipes the database volume too.

### Without Docker

Point `DATABASE_URL` at a local Postgres instance (use `localhost` instead of `postgres` as the host), then:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx tsx scripts/generate-hotels.ts
npx tsx scripts/import-hotels.ts
npm run dev
```

The app runs at http://localhost:3000.

## Docs

- `postman_collection.json` and `collection.openapi` document the API routes
- `docs.pdf` walks through the database models and how they relate to each other
