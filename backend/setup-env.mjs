import fs from 'fs';
import path from 'path';

const newEnvContent = `APP_NAME="224SOLUTIONS"
APP_URL="http://localhost:5173"
# Supabase Postgres (meilleure solution)
DATABASE_URL="postgresql://postgres:<SUPABASE_DB_PASSWORD>@db.uakkxaibujzxdiqzpnpr.supabase.co:5432/postgres?sslmode=require"
NODE_ENV="development"
SUPABASE_URL="https://uakkxaibujzxdiqzpnpr.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM"
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_DB_PASSWORD=""
VITE_SUPABASE_URL="https://uakkxaibujzxdiqzpnpr.supabase.co"
VITE_SUPABASE_PROJECT_ID="uakkxaibujzxdiqzpnpr"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM"
SYNDIC_SCHEMA_PATH="./sql/syndic-schema.sql"`;

const envPath = path.resolve(process.cwd(), '.env');
fs.writeFileSync(envPath, newEnvContent, 'utf8');
console.log('✅ backend/.env écrit.');


