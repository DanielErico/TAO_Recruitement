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
    
    // Attempt creation
    let { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userConfig.email,
      password: userConfig.password,
      email_confirm: true,
      user_metadata: {
        full_name: userConfig.fullName,
        role: userConfig.role
      }
    });

    // If already exists, delete and recreate
    if (createError && (createError.message.includes('already registered') || createError.message.includes('already exists') || createError.status === 422)) {
      console.log(`- User already exists. Finding user by email to delete and reset...`);
      // We can find the user by calling getUser or finding them. Since we can't easily fetch user by email without listUsers,
      // let's try to listUsers just for this single fallback (or since listUsers timed out, let's see).
      // Wait, listUsers is the only way to find user ID by email in Supabase admin API, unless we query auth.users database table.
      // Can we query the database auth.users table? Yes! supabaseAdmin is a Postgres client in a way, but we can also just run listUsers once.
      // Let's call listUsers to get the ID.
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users) {
          const existingUser = users.find(u => u.email === userConfig.email);
          if (existingUser) {
            console.log(`- Deleting user ${existingUser.id}...`);
            await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
            // Re-create
            const retryRes = await supabaseAdmin.auth.admin.createUser({
              email: userConfig.email,
              password: userConfig.password,
              email_confirm: true,
              user_metadata: {
                full_name: userConfig.fullName,
                role: userConfig.role
              }
            });
            user = retryRes.data.user;
            createError = retryRes.error;
          }
        }
      } catch (err) {
        console.error(`- Failed to reset existing user:`, err.message);
      }
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
