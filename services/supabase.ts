
// Configuration Supabase pour le frontend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types TypeScript pour la base de données
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  location: string;
  custom_id: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  total_amount: number;
  status: string;
  delivery_address: string;
  delivery_city: string;
  delivery_country: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: string;
  created_at: string;
  updated_at: string;
}
