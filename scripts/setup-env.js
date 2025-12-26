// Map SUPABASE_DATABASE_URL to DATABASE_URL if needed
// This allows Netlify to use SUPABASE_DATABASE_URL while Prisma expects DATABASE_URL

if (process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
}

