import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mutzxaenmaketlmarqxn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dHp4YWVubWFrZXRsbWFycXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDg1MTYsImV4cCI6MjA4MDE4NDUxNn0.WEoQcaQkPOmFD2E6kcx1j1X0JmlFoaLi5PSKBnG1gOE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
