# Database Setup Guide

## Important: PostgreSQL Required

This application uses **PostgreSQL** for both development and production. SQLite is not supported.

## Quick Setup for Production (Netlify)

### Option 1: Supabase (Recommended - Free Tier)

1. Go to https://supabase.com
2. Sign up and create a new project
3. Wait for the database to be created (takes ~2 minutes)
4. Go to **Settings** → **Database**
5. Find the **Connection string** section
6. Copy the **URI** format connection string
   - It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
7. Add this to Netlify as `DATABASE_URL` environment variable

### Option 2: Neon (Free Tier)

1. Go to https://neon.tech
2. Sign up and create a new project
3. Copy the connection string from the dashboard
4. Add it to Netlify as `DATABASE_URL` environment variable

### Option 3: Railway (Free Tier)

1. Go to https://railway.app
2. Create a new project → Add PostgreSQL
3. Copy the connection string from the database service
4. Add it to Netlify as `DATABASE_URL` environment variable

## After Setting Up Database

Once you have the `DATABASE_URL` set in Netlify:

1. **Run migrations locally** (pointing to your production database):
   ```bash
   # Set your production DATABASE_URL temporarily
   export DATABASE_URL="your-production-connection-string"
   
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npx prisma db push
   
   # Seed email templates
   npm run seed:email-templates
   ```

2. **Or use Prisma Migrate** (recommended for production):
   ```bash
   # Create initial migration
   npx prisma migrate dev --name init
   
   # Apply to production
   npx prisma migrate deploy
   ```

## Local Development Setup

### Using Docker (Easiest):

```bash
docker run --name clickk-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=clickk \
  -p 5432:5432 \
  -d postgres:15
```

Then in your `.env` file:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/clickk
```

### Using Supabase Local:

You can also use Supabase's local development setup, but the Docker method above is simpler.

## Connection String Format

PostgreSQL connection strings follow this format:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Examples:
- Supabase: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
- Neon: `postgresql://[user]:[password]@[host].neon.tech/[database]?sslmode=require`
- Local: `postgresql://postgres:password@localhost:5432/clickk`

## Troubleshooting

### "the URL must start with the protocol `file:`"
- This error means Prisma is trying to use SQLite
- Make sure your `DATABASE_URL` starts with `postgresql://`
- Check that the environment variable is set correctly in Netlify

### Connection Timeout
- Check that your database allows connections from external IPs
- For Supabase/Neon, make sure you're using the connection pooler URL if available
- Check firewall settings

### Authentication Failed
- Verify your password is correct
- Check that the user has proper permissions
- Some providers require SSL - add `?sslmode=require` to the connection string

## Migration from SQLite

If you were using SQLite locally:
1. Export your data (if needed)
2. Set up PostgreSQL database
3. Run `npx prisma db push` to create the schema
4. Import your data if you exported it

