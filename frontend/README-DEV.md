# Local Development Guide

## Architecture Overview
- **Django Backend** (localhost:8000) - Admin operations
- **Vercel Serverless Functions** (localhost:3000) - Read-only API from database
- **React Frontend** (localhost:5173) - User interface

## Setup Instructions

### 1. Environment Variables
Create `.env.local` file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database connection:
```env
DATABASE_URL=postgresql://your_username:your_password@your_aiven_host:port/your_database
VITE_API_URL=http://localhost:8000
```

### 2. Start Django Backend
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```
Backend runs on: http://localhost:8000

### 3. Start Vercel Development Server
```bash
cd frontend
vercel dev
```
Vercel serverless functions run on: http://localhost:3000

### 4. Start React Frontend
In a NEW terminal window:
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## Development Modes

### Mode 1: Full Local Development (Recommended)
- Django Backend: http://localhost:8000
- Vercel Serverless: http://localhost:3000  
- React Frontend: http://localhost:5173
- Database: Your Aiven database

### Mode 2: Vercel Dev Only
```bash
cd frontend
vercel dev
```
- Combines frontend + serverless functions on http://localhost:3000
- Uses your Aiven database directly

### Mode 3: Vite Dev Only
```bash
cd frontend  
npm run dev
```
- Frontend only on http://localhost:5173
- API calls proxy to production Vercel instance

## Testing the APIs

### Test Serverless Functions Directly
```bash
# Test disciplines API
curl http://localhost:3000/api/disciplines

# Test teams API  
curl http://localhost:3000/api/teams

# Test debug schema
curl http://localhost:3000/api/debug-schema
```

### Test Django Admin
- Access Django admin: http://localhost:8000/admin
- Login with your superuser credentials

## Common Issues

### Database Connection Error
- Verify `DATABASE_URL` in `.env.local` is correct
- Ensure your Aiven database allows connections from your IP

### CORS Issues
- Django should allow localhost:5173 and localhost:3000
- Check `CORS_ALLOWED_ORIGINS` in Django settings

### Port Conflicts
- Django: 8000
- Vercel: 3000  
- Vite: 5173
- Change if ports are in use

## Deployment Workflow
1. Test locally with `vercel dev`
2. Push changes to trigger Vercel deployment
3. Deploy Django admin changes to Koyeb separately
