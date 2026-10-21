const { createClient } = require("@supabase/supabase-js");

const configuredsupabaseurl = process.env.supabaseurl;
const supabasesecretkey = process.env.supabasesecretkey;

if (!configuredsupabaseurl || !supabasesecretkey) {
  throw new Error("supabaseurl & supabasesecretkey must be set in .env");
}

let supabaseurl;

try {
  supabaseurl = new URL(configuredsupabaseurl).origin;
} catch {
  throw new Error("supabaseurl must be a complete URL such as https://your-project-ref.supabase.co");
}

const supabase = createClient(supabaseurl, supabasesecretkey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

module.exports = supabase;
