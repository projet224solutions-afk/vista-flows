#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('🔍 Testing Supabase service_role key...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ per_page: 1 });
    console.log('Result:', { error: error ? error.message || error : null, data: data ? data.length : 0 });
    if (error) process.exit(2);
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(3);
  }
})();
