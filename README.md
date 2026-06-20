# SpendWise - Smart Expense Tracker

A secure, cloud-based expense tracking application that enables users to record, manage, and analyze their income and expenses in real time across multiple devices. Built with a React Native (Expo) mobile client and a Node.js/Express REST API backed by PostgreSQL (Neon).

## Features

- User authentication with JWT (access + refresh tokens)
- Multi-wallet management with balance tracking
- Income and expense transactions with custom categories
- Budget creation with threshold alerts (50%, 75%, 100%)
- Wallet-to-wallet transfers
- Financial analytics and spending trends
- Dark mode support

## Project Structure

```
spendwise/
├── client/          # React Native / Expo mobile application
├── server/          # Node.js / Express REST API (CommonJS)
│   ├── src/         # Source code (routes, services, repositories, middleware)
│   ├── tests/       # Unit, integration, and property-based tests
│   └── MIGRATION/   # PostgreSQL migration scripts
├── package.json     # Root workspace configuration
├── .gitignore       # Git ignore rules
└── README.md        # This file
```

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** (Neon serverless recommended)
- **Expo CLI** (`npx expo`)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/SherwinCari/SpendWise.git
cd SpendWise
```

### 2. Install dependencies

From the root directory, install all workspace dependencies:

```bash
npm install
```

### 3. Configure environment

Copy the example environment files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Key server environment variables:
- `DATABASE_URL` — PostgreSQL connection string (Neon)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — Token signing secrets
- `PORT` — Server port (default: 3000)

### 4. Run database migrations

Apply the schema migration against your PostgreSQL database:

```bash
psql $DATABASE_URL -f server/MIGRATION/001_initial_schema.sql
```

### 5. Start the server

```bash
npm run server:dev
```

The API will be available at `http://localhost:3000/api`.

### 6. Start the client

```bash
npm run client:start
```

Scan the QR code with the Expo Go app, or press `a` for Android / `i` for iOS.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run server:dev` | Start server in development mode (nodemon) |
| `npm run server:start` | Start server in production mode |
| `npm run server:test` | Run server test suite |
| `npm run client:start` | Start Expo development server |
| `npm run client:android` | Start client on Android |
| `npm run client:ios` | Start client on iOS |
| `npm run client:web` | Start client on web |

## Tech Stack

### Server
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (Neon serverless)
- **Auth**: JWT (access + refresh tokens), bcrypt password hashing
- **Validation**: Joi schema validation
- **Testing**: Jest, fast-check (property-based), supertest

### Client
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (stack + bottom tabs)
- **UI**: React Native Paper, custom themed components
- **Storage**: AsyncStorage, Expo SecureStore (tokens)
- **HTTP**: Axios with token refresh interceptor

## License

ISC
