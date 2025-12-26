# Quick Setup Steps

## 1. Get Your Database Password

If you don't remember your Supabase database password:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Database password** section
5. Click **Reset database password** if needed, or copy the existing one

## 2. Create Your Connection String

Replace `[YOUR-PASSWORD]` in this string with your actual password:

```
postgresql://postgres:[YOUR-PASSWORD]@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres
```

Example (if your password was `mypassword123`):
```
postgresql://postgres:mypassword123@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres
```

## 3. Add to Netlify

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add variable**
5. Key: `DATABASE_URL`
6. Value: Your complete connection string (with password)
7. Click **Save**

## 4. Run Database Migrations

After adding the DATABASE_URL to Netlify, run these commands locally:

```bash
# Set your DATABASE_URL (replace with your actual password)
export DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.pclcaauruucktjzrsicx.supabase.co:5432/postgres"

# Generate Prisma client
npx prisma generate

# Push schema to create all tables
npx prisma db push

# Seed email templates
npm run seed:email-templates
```

## 5. Create Your First User

After migrations are complete, create your admin user:

```bash
# Make sure DATABASE_URL is still set
node scripts/create-user.js
```

Follow the prompts to create your first user account.

## 6. Redeploy on Netlify

After everything is set up:
- Either push a new commit to trigger a rebuild
- Or go to Netlify dashboard → **Deploys** → **Trigger deploy** → **Deploy site**

## Troubleshooting

### "password authentication failed"
- Check that your password is correct
- Make sure there are no extra spaces in the connection string
- Try resetting your database password in Supabase

### "connection refused" or timeout
- Check that your Supabase project is active
- Verify the connection string format is correct
- Make sure you're using port 5432 for direct connection

### "relation does not exist"
- Run `npx prisma db push` to create the tables
- Check that migrations completed successfully

