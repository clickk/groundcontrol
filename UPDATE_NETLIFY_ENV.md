# Update Netlify Environment Variables

## Current Issue
Your Netlify deployment is using the direct connection URL (port 5432) which isn't working. You need to update it to use the connection pooler URL.

## Steps to Fix

### 1. Get Connection Pooler URL from Supabase

1. Go to https://supabase.com/dashboard
2. Select your project (pclcaauruucktjzrsicx)
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **Session mode** (NOT "URI" mode)
6. Copy the connection string - it will look like:
   ```
   postgresql://postgres.pclcaauruucktjzrsicx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 2. Update Netlify Environment Variable

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Find `DATABASE_URL`
5. Click **Edit**
6. Replace the value with the connection pooler URL from step 1
7. Make sure to replace `[PASSWORD]` with your actual password: `FuckYouJezweb1`
8. Click **Save**

### 3. Trigger a New Deployment

After updating the environment variable:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for the deployment to complete

## Example Connection Pooler URL Format

Your updated `DATABASE_URL` should look like:
```
postgresql://postgres.pclcaauruucktjzrsicx:FuckYouJezweb1@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

Replace `[region]` with your actual region (e.g., `ap-southeast-2` for Australia, `us-east-1` for US East, etc.)

## Why Connection Pooler?

- **Port 6543** (pooler) works better for serverless/Netlify
- **Port 5432** (direct) often gets blocked or requires special network setup
- Connection pooler handles connection management automatically
- Better for production serverless environments

## Also Update Local .env

After getting the pooler URL, update your local `.env` file too:

```bash
DATABASE_URL="postgresql://postgres.pclcaauruucktjzrsicx:FuckYouJezweb1@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Then test locally:
```bash
npx prisma db push
```

