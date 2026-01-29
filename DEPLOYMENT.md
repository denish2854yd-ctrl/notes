# Deployment Guide

This guide will help you deploy the Notes application for your own use.

## Prerequisites

- Node.js 18+ installed
- A PostgreSQL database (recommended: [Neon](https://neon.tech) for serverless)
- A deployment platform (Vercel, Railway, or any Node.js hosting)

## Step-by-Step Deployment

### 1. Clone and Setup

```bash
git clone https://github.com/bornebyte/notes.git
cd notes
npm install --legacy-peer-deps
```

### 2. Database Setup

#### Create Database
1. Sign up at [Neon](https://neon.tech) or use your PostgreSQL provider
2. Create a new database
3. Copy the connection string

#### Initialize Schema
Run the SQL commands from `schema.sql` in your database:

```bash
# If using Neon console, copy-paste the contents of schema.sql
# Or use psql:
psql "your_connection_string" -f schema.sql
```

**Important Tables:**
- `notes` - Stores all notes
- `targetdate` - Stores target dates/goals
- `messages` - Contact form messages
- `users` - User accounts
- `tokens` - API authentication tokens
- `notifications` - User notifications
- `passwordresettoken` - Password reset tokens

### 3. Environment Variables

Create `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Required
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
SESSION_SECRET="generate_random_32_char_string"
NEXT_PUBLIC_DOMAIN="https://your-domain.com"

# Optional
NEXT_PUBLIC_USERNAME="Your Name"
NEXT_PUBLIC_LOGO="logo.jpg"
```

#### Generate SESSION_SECRET

```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 4. Add Your Logo

Place your logo file in the `/public` folder:
- Recommended: `logo.jpg` or `logo.png`
- Size: 400x400px or similar square aspect ratio
- Update `NEXT_PUBLIC_LOGO` in `.env.local` to match your filename

### 5. Create Admin Account

After deployment, create your admin user account:

```sql
-- Replace with your email and desired password
INSERT INTO users (email, password) 
VALUES ('your-email@example.com', 'your-password');
```

**Note:** Store the password securely. The app will hash it on first login.

### 6. Deploy

#### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

#### Option B: Railway

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. Create new project from GitHub repo
4. Add environment variables
5. Deploy

#### Option C: Self-Hosted

```bash
npm run build
npm start
```

Use PM2 or similar for process management:
```bash
npm install -g pm2
pm2 start npm --name "notes-app" -- start
pm2 save
pm2 startup
```

## Common Issues and Solutions

### 1. Hardcoded Domain Issue ✅ FIXED
**Problem:** Share URLs showing wrong domain when others deploy

**Solution:** Now uses `NEXT_PUBLIC_DOMAIN` environment variable
- Set your domain in `.env.local`
- Share links will use your domain automatically

### 2. Database Connection Issues

**Problem:** Cannot connect to database

**Solutions:**
- Verify `DATABASE_URL` is correct
- Ensure database allows connections from your deployment IP
- For Neon: Check that connection pooling is enabled
- Verify SSL mode is set correctly

### 3. Session Secret Not Set

**Problem:** Auth not working, sessions failing

**Solution:**
- Ensure `SESSION_SECRET` is set in `.env.local`
- Must be at least 32 characters
- Never commit this to git

### 4. Logo Not Showing

**Problem:** Default or broken logo image

**Solutions:**
- Verify logo file exists in `/public` folder
- Check `NEXT_PUBLIC_LOGO` matches the exact filename
- Ensure file extension is correct (.jpg, .png, etc.)

### 5. Environment Variables Not Loading

**Problem:** Shows default values or errors

**Solutions:**
- Client-side variables MUST start with `NEXT_PUBLIC_`
- Restart dev server after changing `.env.local`
- For production, rebuild the app after env changes
- In Vercel/Railway, add env vars in dashboard

### 6. API Token Authentication Not Working

**Problem:** External API calls failing

**Solutions:**
- Generate token via Settings → API Tokens in web UI
- Include header: `X-API-Token: your_token_here`
- Verify token exists in `tokens` table
- Check rate limiting (100 req/min default)

### 7. Schema Not Initialized

**Problem:** Database errors, tables don't exist

**Solution:**
- Run all SQL from `schema.sql` in your database
- Verify all 7 tables are created
- Check table permissions

### 8. Wrong Username Showing (System Variable)

**Problem:** Shows system username instead of configured name

**Solution:** ✅ FIXED
- Now uses `NEXT_PUBLIC_USERNAME`
- Avoid using `USERNAME` (reserved system variable)

### 9. Share Links Not Working

**Problem:** Shared notes/targets return 404

**Solutions:**
- Verify `NEXT_PUBLIC_DOMAIN` is set correctly
- Check that shareid is generated (not null in database)
- Ensure public routes are not blocked by middleware

### 10. Build Failures

**Problem:** `npm run build` fails

**Solutions:**
- Use `npm install --legacy-peer-deps`
- Verify Node.js version is 18+
- Check for TypeScript errors
- Ensure all dependencies installed

## Post-Deployment Checklist

- [ ] Database schema initialized
- [ ] Admin user created
- [ ] Environment variables set
- [ ] Logo uploaded to `/public`
- [ ] `NEXT_PUBLIC_DOMAIN` set to your domain
- [ ] Test login functionality
- [ ] Test creating a note
- [ ] Test sharing a note (verify correct domain in link)
- [ ] Test target dates
- [ ] Generate and test API token
- [ ] Check notifications working

## Security Recommendations

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use strong SESSION_SECRET** - Random 32+ characters
3. **HTTPS only in production** - Configure SSL/TLS
4. **Regular backups** - Backup your database regularly
5. **Update dependencies** - Run `npm audit` regularly
6. **Limit API access** - Monitor and adjust rate limits
7. **Secure admin credentials** - Use strong passwords

## Updating the App

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --legacy-peer-deps

# Check for schema changes
# Compare schema.sql with your database

# Rebuild and restart
npm run build
npm start
```

## Support

If you encounter issues:
1. Check this guide first
2. Review [README.md](README.md) and [API_REFERENCE.md](API_REFERENCE.md)
3. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Environment (Node version, platform, etc.)

## Environment-Specific Notes

### Development
```env
NEXT_PUBLIC_DOMAIN="http://localhost:3000"
```

### Production
```env
NEXT_PUBLIC_DOMAIN="https://your-domain.com"
# or
NEXT_PUBLIC_DOMAIN="https://your-app.vercel.app"
```

### Testing
- Test share functionality with production domain
- Verify all environment variables load correctly
- Check that API tokens work from external sources
- Test both cookie and token authentication methods

---

**Remember:** After any environment variable changes, always restart your development server or rebuild for production!
