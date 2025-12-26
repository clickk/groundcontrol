// Environment variable helpers
// Maps SUPABASE_DATABASE_URL to DATABASE_URL if needed

if (process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
}

export {};

