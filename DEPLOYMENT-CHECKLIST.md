# Deployment Checklist

## Pre-Deployment Checklist ✅

### Backend (Django on Koyeb)
- [ ] Environment variables set on Koyeb:
  - `SECRET_KEY` (unique, not the default)
  - `DEBUG=False`
  - `DATABASE_URL` (Aiven PostgreSQL)
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_ACCOUNT_ID`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`
- [ ] Migrations applied: `python manage.py migrate`
- [ ] Static files collected: `python manage.py collectstatic`
- [ ] Superuser created for admin access
- [ ] CORS settings include your Vercel domain

### Frontend (Vercel)
- [ ] Environment variables set in Vercel dashboard:
  - `DATABASE_URL` (Aiven PostgreSQL - same as backend)
  - `VITE_API_URL` (your Django backend URL)
- [ ] Build process works: `npm run build`
- [ ] Serverless functions tested locally
- [ ] Contact page loads disciplines correctly
- [ ] Language switching works (RO/EN)

### Database (Aiven)
- [ ] PostgreSQL database accessible
- [ ] Tables created via Django migrations
- [ ] Sample data added (coaches, disciplines, teams)
- [ ] Head coaches assigned to disciplines

## Post-Deployment Checklist 🔍

### Testing
- [ ] Frontend loads at your Vercel domain
- [ ] Contact page shows disciplines with/without head coaches
- [ ] Language switching works
- [ ] Django admin accessible at your Koyeb domain
- [ ] API endpoints return data correctly

### Security
- [ ] DEBUG=False in production
- [ ] SECRET_KEY is unique and secure
- [ ] ALLOWED_HOSTS includes your domains
- [ ] No sensitive data in git repo
- [ ] Environment variables properly set

## Deployment Commands

### Backend (Koyeb)
```bash
# Apply migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser (if needed)
python manage.py createsuperuser
```

### Frontend (Vercel)
```bash
# Build locally to test
npm run build

# Deploy (automatic on git push)
git push origin main
```

## Environment Variables Reference

### Backend (Koyeb)
```env
SECRET_KEY=your_unique_secret_key_here
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:port/dbname
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-account.r2.cloudflarestorage.com/bucket-name
```

### Frontend (Vercel)
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
VITE_API_URL=https://your-django-app.koyeb.app
```

## Troubleshooting

### Common Issues
1. **CORS errors**: Add Vercel domain to Django CORS_ALLOWED_ORIGINS
2. **Database connection**: Verify DATABASE_URL is correct and accessible
3. **Static files**: Ensure collectstatic was run and R2 is configured
4. **Environment variables**: Check they're set correctly on each platform

### Debug Commands
```bash
# Check Django settings
python manage.py check --deploy

# Test database connection
python manage.py dbshell

# Check migrations
python manage.py showmigrations
```

## URLs After Deployment
- **Frontend**: https://your-app.vercel.app
- **Backend Admin**: https://your-app.koyeb.app/admin
- **API**: https://your-app.koyeb.app/api/

## Monitoring
- [ ] Check Vercel logs for frontend errors
- [ ] Monitor Koyeb logs for backend issues
- [ ] Test Contact page regularly
- [ ] Check database performance on Aiven
