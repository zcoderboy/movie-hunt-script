const supabase = require('@supabase/supabase-js')

const client = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = client