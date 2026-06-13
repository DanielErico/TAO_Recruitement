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

async function seedJobs() {
  console.log('Seeding mock jobs into live database...\n');

  // 1. Get Recruiter ID
  const { data: recruiter, error: recError } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', 'recruiter@tao.org')
    .single();

  if (recError || !recruiter) {
    console.error('Error: Recruiter account recruiter@tao.org not found in user_profiles. Run create-test-users.js first.');
    process.exit(1);
  }

  console.log(`Found Recruiter ID: ${recruiter.id}`);

  // 2. Fetch departments
  const { data: depts, error: deptError } = await supabaseAdmin
    .from('departments')
    .select('id, name');

  if (deptError || !depts || depts.length === 0) {
    console.error('Error: No departments found. Make sure Migration 002 has run and seeded departments.');
    process.exit(1);
  }

  const engDept = depts.find(d => d.name === 'Engineering');
  const desDept = depts.find(d => d.name === 'Design');

  if (!engDept || !desDept) {
    console.error('Error: Engineering or Design department not found in database.');
    process.exit(1);
  }

  const mockJobs = [
    {
      title: 'AI Software Engineer',
      department_id: engDept.id,
      employment_type: 'full_time',
      experience_level: 'mid',
      location: 'London, UK',
      remote: true,
      salary_min: 75000,
      salary_max: 95000,
      description: `We are looking for an AI Software Engineer to join our core Engineering team. You will build and scale AI-powered components of our platforms, integrating with cutting-edge LLMs (such as NVIDIA Nemotron) and optimizing prompt performance.

If you love pairing software engineering best practices with AI capabilities, this role is for you!`,
      responsibilities: `- Design, implement, and maintain API endpoints connecting software products with LLMs.
- Optimize retrieval-augmented generation (RAG) loops and semantic search systems.
- Build resilient, scalable middleware and data ingestion pipelines in TypeScript/Node.js.
- Collaborative design of schema structures and database architectures.`,
      requirements: `- 3+ years of professional experience building web apps with TypeScript and React/Next.js.
- Practical experience working with LLMs, prompt engineering, or vector databases.
- Familiarity with PostgreSQL, schema design, and query optimization.
- Strong problem-solving skills and clean coding practices.`,
      skills_required: ['TypeScript', 'Next.js', 'PostgreSQL', 'LLMs', 'Prompt Engineering', 'RAG'],
      status: 'published',
      created_by: recruiter.id
    },
    {
      title: 'Senior Product Designer',
      department_id: desDept.id,
      employment_type: 'full_time',
      experience_level: 'senior',
      location: 'London, UK',
      remote: false,
      salary_min: 80000,
      salary_max: 110000,
      description: `Join our Design team to shape the user experience of TAO's enterprise recruitment platforms. You will own the design lifecycle from user research and wireframing to high-fidelity mockups, crafting clean, premium B2B SaaS interfaces.`,
      responsibilities: `- Lead product design initiatives for recruitment and admin dashboards.
- Conduct user research, user testing, and translate insights into structural design solutions.
- Maintain and expand our design system components and styling guides.
- Partner with Engineering to ensure high-fidelity implementation of layouts.`,
      requirements: `- 5+ years of UI/UX design experience in digital product design (preferably B2B SaaS).
- Masterful command of Figma, prototyping tools, and asset delivery.
- Experience building and maintaining unified design systems.
- Strong typography, grid alignment, and visual hierarchy skills.`,
      skills_required: ['Figma', 'UI/UX Design', 'Prototyping', 'Design Systems', 'User Research'],
      status: 'published',
      created_by: recruiter.id
    }
  ];

  for (const job of mockJobs) {
    console.log(`Upserting job: "${job.title}"`);
    const { error: insertError } = await supabaseAdmin
      .from('jobs')
      .upsert(job, { onConflict: 'title' }); // Let's use title as conflict target since there's no unique constraints on title (we'll just use normal insert or check if exists first)
  }

  // To be safe, let's check if they exist by title first, or just insert them
  for (const job of mockJobs) {
    const { data: existing } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('title', job.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Job "${job.title}" already exists. Updating...`);
      await supabaseAdmin
        .from('jobs')
        .update(job)
        .eq('id', existing[0].id);
    } else {
      console.log(`Job "${job.title}" not found. Inserting...`);
      await supabaseAdmin
        .from('jobs')
        .insert(job);
    }
  }

  console.log('\nJobs seeding finished successfully.');
}

seedJobs();
