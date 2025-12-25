# Deployment Guide

This guide will help you set up GitHub integration and auto-deploy to Netlify.

## Prerequisites

- GitHub account
- Netlify account
- All environment variables configured

## Step 1: Initialize Git Repository

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"
```

## Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. **Do NOT** initialize with README, .gitignore, or license (we already have these)
3. Copy the repository URL (e.g., `https://github.com/yourusername/clickk-app.git`)

## Step 3: Connect Local Repository to GitHub

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/clickk-app.git

# Rename default branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 4: Set Up Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize Netlify
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build` (or leave default)
   - **Publish directory**: `.next` (Next.js will handle this)
   - **Node version**: `18` (or use `.nvmrc` file)

## Step 5: Configure Environment Variables in Netlify

In Netlify dashboard, go to Site settings → Environment variables and add:

### Required Variables:

```
DATABASE_URL=your_database_url
CLICKUP_API_TOKEN=your_clickup_token
CLICKUP_LIST_ID=your_list_id
CLICKUP_TEAM_ID=your_team_id
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=help@clickk.com.au
SENDGRID_FROM_NAME=Clickk
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Database Setup

For production, you'll need a PostgreSQL database. Options:
- **Supabase** (free tier available)
- **Railway** (free tier available)
- **Neon** (free tier available)
- **PlanetScale** (free tier available)

Update your `DATABASE_URL` in Netlify to point to your production database.

### Prisma Setup

After setting up the database, run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed email templates (optional)
npm run seed:email-templates
```

You can do this locally and it will update your production database, or set up a Netlify build plugin to run migrations.

## Step 6: Auto-Deployment

Once connected:
- Every push to `main` branch will automatically trigger a new deployment
- Netlify will build and deploy your site automatically
- You can see deployment status in the Netlify dashboard

## Step 7: Custom Domain (Optional)

1. In Netlify dashboard, go to Domain settings
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- Check build logs in Netlify dashboard
- Ensure all environment variables are set
- Verify Node version matches (should be 18)

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database allows connections from Netlify IPs
- Ensure database is accessible (not localhost)

### Prisma Issues

- Make sure `prisma generate` runs during build (it's in the build script)
- Check that Prisma schema matches your database

## Continuous Deployment Workflow

1. Make changes locally
2. Commit changes: `git commit -m "Description of changes"`
3. Push to GitHub: `git push`
4. Netlify automatically builds and deploys
5. Check deployment status in Netlify dashboard

## Branch Deploys

Netlify can also deploy previews for pull requests:
- Create a feature branch
- Push to GitHub
- Create a pull request
- Netlify will create a preview deployment

## Notes

- The `.next` directory is built during deployment, don't commit it
- Environment variables in `.env` are not committed (they're in `.gitignore`)
- Always set environment variables in Netlify dashboard, not in code
- Database migrations should be run manually or via a build script

