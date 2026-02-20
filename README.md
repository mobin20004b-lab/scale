# Weight-Based Warehouse Management System

A comprehensive Persian/Farsi warehouse management system with weight-based inventory tracking.

## Features

- 🔐 Authentication with NextAuth.js
- 📦 Product Management (CRUD operations)
- ⚖️ Weight-based Stock In/Out operations
- 📱 Barcode/QR code scanning
- 📊 Advanced reporting with charts and exports
- 🌍 Full RTL support for Persian/Farsi
- 🔌 External API for third-party integration
- 📝 Complete activity logging

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon provided)

### Environment Variables

Required environment variables (set in the Vars section):

```env
DATABASE_URL="your_neon_database_url"
NEXTAUTH_SECRET="generate_a_random_secret"
NEXTAUTH_URL="http://localhost:3000"
API_SECRET_KEY="your_api_key_for_external_endpoints"
```

### Database Setup

The database schema is already created. Sample data includes:
- Test user: username `admin`, password `admin123`
- Sample products with initial inventory

### Running the Application

```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000` and login with the test credentials.

## API Documentation

External API endpoints available at `/api/external/*`:

### Authentication
All external endpoints require Bearer token authentication:
```
Authorization: Bearer YOUR_API_SECRET_KEY
```

### Endpoints

**GET /api/external/products**
- Get all products with current inventory

**GET /api/external/product/:id**
- Get specific product details

**POST /api/external/stock-in**
- Record stock in operation
- Body: `{ productId, quantity, weight, notes }`

**POST /api/external/stock-out**
- Record stock out operation  
- Body: `{ productId, quantity, weight, reason, notes }`

**GET /api/external/inventory**
- Get complete inventory report

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- NextAuth.js v5
- Tailwind CSS v4
- shadcn/ui components
- Recharts for data visualization
- html5-qrcode for scanning

## Docker

Build and run locally:

```bash
docker build -t warehouse-app .
docker run --rm -p 3000:3000 --env-file .env warehouse-app
```

### GitHub Actions Docker publish

A workflow is included at `.github/workflows/docker-build-push.yml` to build and push images to GHCR on:
- Pushes to `main`
- Version tags like `v1.0.0`
- Manual dispatch

Published image path:

```text
ghcr.io/<owner>/<repo>
```
