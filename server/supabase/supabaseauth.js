const { createClient } = require("@supabase/supabase-js");

const supabaseurl = process.env.supabaseurl;
const supabasepublishablekey = process.env.supabasepublishablekey || process.env.supabaseanonkey;

if (!supabaseurl || !supabasepublishablekey) {
  throw new Error("supabaseurl & supabasepublishablekey must be set in .env");
}

const createauthclient = () => createClient(supabaseurl, supabasepublishablekey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

module.exports = createauthclient;
