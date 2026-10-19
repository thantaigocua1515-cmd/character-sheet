import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configOk = Boolean(url && anonKey);
export const supabase = configOk ? createClient(url, anonKey) : null;
