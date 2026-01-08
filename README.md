# NetVoya Backend Server

A Node.js/Express backend API for the NetVoya eSIM platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/register` | User registration |
| POST | `/api/login` | User authentication |
| GET | `/api/users` | List all users (debug only) |

## Test Credentials

```
Email: test@test.com
Password: Test1234
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3001
JWT_SECRET=your-secret-key
```

## API Examples

### Register User
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123",
    "companyName": "Acme Inc",
    "role": "partner"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234"
  }'
```

## Tech Stack

- Node.js + Express
- TypeScript
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- cors (Cross-Origin support)
