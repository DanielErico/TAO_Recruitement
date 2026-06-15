const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
let supabaseUrl = '';
let supabaseServiceRoleKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
  const keyMatch = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseServiceRoleKey = keyMatch[1].trim();
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase credentials not found in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  console.log('Querying the absolute latest cv_analyses record...');
  const { data, error } = await supabase
    .from('cv_analyses')
    .select('id, full_name, email, job_fit_score, raw_json, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error querying Supabase:', error);
  } else {
    if (data.length > 0) {
      const rec = data[0];
      console.log(`\n--- LATEST RECORD ---`);
      console.log(`ID: ${rec.id}`);
      console.log(`Name: ${rec.full_name}`);
      console.log(`Created At: ${rec.created_at}`);
      console.log(`Raw JSON contents:`);
      console.log(JSON.stringify(rec.raw_json, null, 2));
    } else {
      console.log('No records found in cv_analyses table.');
    }
  }
}

run();
