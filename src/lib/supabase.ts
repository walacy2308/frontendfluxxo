import { createClient } from "@supabase/supabase-js";

// Fallback values in case environment variables are not set in Vercel/deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ndfdthomsmnuyfbsukaz.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZmR0aG9tc21udXlmYnN1a2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDI5NzYsImV4cCI6MjA5MTI3ODk3Nn0.FcDobyWRMEHuJcDsqRZ98s-Y4fLQen6BPVuolYQeI1s";
console.log("URL:", import.meta.env.VITE_SUPABASE_URL);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials are missing. Please check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
