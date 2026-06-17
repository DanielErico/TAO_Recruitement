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

if (!supabaseUrl || !serviceKey) {
  console.error('Error: Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

const testUsers = [
  {
    email: 'admin@tao.org',
    password: 'password123',
    fullName: 'TAO Admin User',
    role: 'admin'
  },
  {
    email: 'recruiter@tao.org',
    password: 'password123',
    fullName: 'TAO Recruiter User',
    role: 'recruiter'
  },
  {
    email: 'candidate@tao.org',
    password: 'password123',
    fullName: 'TAO Candidate User',
    role: 'candidate'
  }
];

async function createAccounts() {
  console.log('Starting test accounts creation...\n');

  for (const userConfig of testUsers) {
    console.log(`Processing: ${userConfig.email} (${userConfig.role})`);
    
    let user = null;
    let createError = null;

    try {
      // 1. Check if user profile already exists
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', userConfig.email)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profileData) {
        console.log(`- User exists with profile ID: ${profileData.id}. Updating password/metadata...`);
        const { data: updateRes, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profileData.id, {
          password: userConfig.password,
          user_metadata: {
            full_name: userConfig.fullName,
            role: userConfig.role
          }
        });
        if (updateError) {
          throw updateError;
        }
        user = updateRes.user;
      } else {
        console.log(`- User profile not found. Creating new user...`);
        const { data: createRes, error: err } = await supabaseAdmin.auth.admin.createUser({
          email: userConfig.email,
          password: userConfig.password,
          email_confirm: true,
          user_metadata: {
            full_name: userConfig.fullName,
            role: userConfig.role
          }
        });
        user = createRes.user;
        createError = err;
      }
    } catch (err) {
      console.error(`- Failed to process user:`, err.message);
      createError = err;
    }

    if (createError) {
      console.error(`- Error: ${createError.message}`);
    } else if (user) {
      console.log(`- Successfully created/reset user with ID: ${user.id}`);
      
      // Let's verify and force write the profile just in case the trigger had issues
      const { error: manualProfileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: userConfig.email,
          full_name: userConfig.fullName,
          role: userConfig.role
        });
        
      if (manualProfileError) {
        console.warn(`- Profile warning (could be duplicate): ${manualProfileError.message}`);
      } else {
        console.log(`- Profile verified/upserted.`);
      }
    }
    console.log('');
  }

  console.log('Test accounts processing finished.');
}

createAccounts();
