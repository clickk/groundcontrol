# Supabase Database Setup

## Your Supabase Project
- Project URL: https://pclcaauruucktjzrsicx.supabase.co
- Publishable Key: sb_publishable_yfT-S7STRywae8ZQEq7evg_ik0LAYMV

## Getting the Database Connection String

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (pclcaauruucktjzrsicx)
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string** section
5. Select **URI** tab (not Session mode)
6. Copy the connection string - it will look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## Important Notes

- You'll need your **database password** (the one you set when creating the project)
- If you forgot it, you can reset it in Settings → Database → Database password
- Use the **Connection pooling** URL (port 6543) for better performance
- Or use the **Direct connection** URL (port 5432) if pooling isn't available

## Setting Up in Netlify

1. Copy the full connection string from Supabase
2. Go to Netlify → Your Site → Site settings → Environment variables
3. Add/Update `DATABASE_URL` with the connection string
4. Make sure to replace `[YOUR-PASSWORD]` with your actual database password

## Example Connection String Format

```
postgresql://postgres.pclcaauruucktjzrsicx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

Or for direct connection:
```
postgresql://postgres:[YOUR-PASSWORD]@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres
```

## After Setting DATABASE_URL

Once you've added the `DATABASE_URL` to Netlify, you need to run the database migrations:

```bash
# Set your DATABASE_URL (use the one from Supabase)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres"

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed email templates
npm run seed:email-templates
```

## Testing the Connection

You can test if the connection works:

```bash
# Set DATABASE_URL
export DATABASE_URL="your-connection-string"

# Test connection
npx prisma db pull
```

If this works, your connection string is correct!

