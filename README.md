# Portfolio Backend

A Node.js + Express + MongoDB backend for the portfolio website. It provides APIs for managing profile information, projects, skills, and admin authentication.

## Tech Stack
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- CORS

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy the example file and update the values:
```bash
copy .env
```

Example:
```env
PORT=3005
MONGO_URI=mongodb://127.0.0.1:27017/portfolio
ADMIN_SECRET=your-admin-secret
JWT_SECRET=your-jwt-secret
```

### 3. Run locally
```bash
npm run dev
```

### 4. Start in production
```bash
npm start
```

## API Overview
- POST /api/admin/login
- GET /api/profile
- GET /api/projects
- GET /api/skills
- Admin routes for managing profile, projects, and skills

