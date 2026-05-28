// Swapped package import to standard library to resolve bundler failure
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_URL = "https://lrvvnuzthpwsbhmxtkvh.supabase.co";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || PROJECT_URL;

// Using your client-safe public fallback anon token string
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxydnZudXp0aHB3c2JobXh0a3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDEwNjIsImV4cCI6MjA5NDkxNzA2Mn0.B2TQ_G-9QzPxV9dd-fnjDtBKxiJDdVSdoXt9yg2jqUg";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});