import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qtbkvshbmqlszncxlcuc.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Ymt2c2hibXFsc3puY3hsY3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjgxNjQsImV4cCI6MjA5MTAwNDE2NH0.HJOr2NCBJ1BwSRppQqoYxsszgrX_BY3UAmqmqPhPiTE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Reseller = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  ref_code: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  tier: 'bronze' | 'prata' | 'ouro';
  total_keys_bought: number;
  total_keys_sold: number;
  total_revenue_cents: number;
  pix_key?: string;
  entry_paid: boolean;
  entry_payment_id?: string;
  created_at: string;
  updated_at: string;
};

export type ResellerPackage = {
  id: string;
  code: string;
  size: number;
  unit_price_cents: number;
  total_cents: number;
  is_popular: boolean;
  active: boolean;
};

export type ResellerPurchase = {
  id: string;
  reseller_id: string;
  plan_code?: '7dias' | '30dias' | 'vitalicio';
  package_size: number; // legacy (agora = quantity)
  unit_price_cents: number;
  total_cents: number;
  payment_method: 'pix' | 'card';
  payment_id?: string;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed';
  qr_code_base64?: string;
  qr_code_text?: string;
  expires_at?: string;
  paid_at?: string;
  keys_generated: number;
  created_at: string;
};

export type License = {
  id: string;
  license_key: string;
  status: string;
  reseller_id?: string;
  reseller_purchase_id?: string;
  sold_to_name?: string;
  sold_to_whatsapp?: string;
  sold_at?: string;
  sold_price_cents?: number;
  activated_at?: string;
  created_at: string;
};
