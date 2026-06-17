const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: apps, error: appErr } = await supabase
    .from('applications')
    .select('id, resume_url, applied_at, status, cover_letter')
    .order('applied_at', { ascending: false })
    .limit(1);

  if (appErr) {
    console.error('Apps Error:', appErr);
    return;
  }

  if (apps.length === 0) {
    console.log('No applications found.');
    return;
  }

  const app = apps[0];
  console.log(`Latest App ID: ${app.id} | Applied At: ${app.applied_at} | Cover Letter: ${app.cover_letter}`);
  
  const { data: analysis, error: cvErr } = await supabase
    .from('cv_analyses')
    .select('*')
    .eq('application_id', app.id)
    .maybeSingle();

  if (cvErr) {
    console.error('CV Analyses Error:', cvErr);
  } else if (analysis) {
    console.log('CV Analysis found:');
    console.log('Name:', analysis.full_name);
    console.log('Email:', analysis.email);
    console.log('Summary:', analysis.professional_summary);
    console.log('Raw JSON:', JSON.stringify(analysis.raw_json, null, 2));
  } else {
    console.log('No CV analysis found for this app ID.');
  }
}

run();
