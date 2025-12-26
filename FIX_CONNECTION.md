# Fixing Database Connection

## Issue: "Can't reach database server"

Supabase requires SSL connections. Add `?sslmode=require` to your connection string.

## Correct Connection String Format

Your connection string should include SSL:

```
postgresql://postgres:[YOUR-PASSWORD]@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres?sslmode=require
```

## Steps to Fix

1. **Get your database password** from Supabase dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → Database → Database password

2. **Create the connection string with SSL**:
   ```bash
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres?sslmode=require"
   ```

3. **Test the connection**:
   ```bash
   npx prisma db push
   ```

4. **If that works, run migrations**:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed:email-templates
   ```

## Alternative: Use Connection Pooler (Recommended)

Supabase also provides a connection pooler which is better for serverless:

1. Go to Supabase dashboard → Settings → Database
2. Find "Connection string" section
3. Select "Session mode" or "Transaction mode"
4. Copy the connection string (it will have port 6543)
5. It will look like:
   ```
   postgresql://postgres.pclcaauruucktjzrsicx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

This connection pooler URL is better for Netlify/serverless environments.

