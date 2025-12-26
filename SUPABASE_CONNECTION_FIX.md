# Fixing Supabase Connection

## Current Issue
The direct connection (port 5432) is not working. This could be because:
1. Your Supabase project is paused (free tier auto-pauses)
2. Direct connections are blocked
3. Need to use connection pooler instead

## Solution: Use Connection Pooler URL

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard
   - Select your project (pclcaauruucktjzrsicx)

2. **Get Connection Pooler URL**:
   - Go to **Settings** → **Database**
   - Scroll to **Connection string** section
   - Select **Session mode** (or Transaction mode)
   - Copy the connection string
   - It will look like:
     ```
     postgresql://postgres.pclcaauruucktjzrsicx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```

3. **Update your .env file**:
   ```bash
   DATABASE_URL="postgresql://postgres.pclcaauruucktjzrsicx:FuckYouJezweb1@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

## Alternative: Check if Project is Paused

1. Go to https://supabase.com/dashboard
2. Check if your project shows "Paused" status
3. If paused, click "Restore" to wake it up
4. Wait 1-2 minutes for it to fully start
5. Then try connecting again

## Test Connection

After updating the connection string:

```bash
npx prisma db push
```

If it works, you'll see the schema being pushed to the database.

