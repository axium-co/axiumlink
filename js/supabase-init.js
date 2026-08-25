/* Cliente Supabase único — usado por admin.html e index.html */
const supabase = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);
