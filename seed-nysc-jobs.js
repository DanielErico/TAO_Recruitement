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

async function seedNYSCJobs() {
  console.log('Seeding NYSC Corps Member job openings...\n');

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
    console.error('Error: No departments found. Make sure migrations are run.');
    process.exit(1);
  }

  // Helper mapping function to find department UUID
  const getDeptId = (name) => {
    const d = depts.find(dept => dept.name.toLowerCase() === name.toLowerCase());
    return d ? d.id : depts.find(dept => dept.name === 'Operations').id; // Fallback to Operations
  };

  const nyscJobs = [
    {
      title: 'Animal Production Executive (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in animal production',
      responsibility: 'Operate livestock production',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Animal Production', 'Livestock Husbandry', 'Farm Operations', 'Feeds Management']
    },
    {
      title: 'Crop Production Executive (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in crop production',
      responsibility: 'Operate crop production',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Crop Production', 'Agronomy', 'Farm Management', 'Pest Control']
    },
    {
      title: 'Veterinary Doctor (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in veterinary medicine',
      responsibility: 'Operate veterinary clinic',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Veterinary Medicine', 'Animal Care', 'Diagnostics', 'Clinical Treatment']
    },
    {
      title: 'Soil Scientist (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in soil science',
      responsibility: 'Operate soil management',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Soil Science', 'Fertility Analysis', 'Sampling', 'Land Management']
    },
    {
      title: 'Architect (NYSC)',
      dept: 'Engineering',
      profile: 'Masters degree in architecture',
      responsibility: 'Operate architectural development',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Architecture', 'AutoCAD', 'Revit', '3D Modeling', 'Drafting']
    },
    {
      title: 'Mechanical Engineer (NYSC)',
      dept: 'Engineering',
      profile: 'Bachelors degree in mechanical engineering',
      responsibility: 'Operate machinery management',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Mechanical Engineering', 'Machine Operations', 'Maintenance', 'Diagnostics']
    },
    {
      title: 'Civil Engineer (NYSC)',
      dept: 'Engineering',
      profile: 'Bachelors degree in civil engineering',
      responsibility: 'Operate building development',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Civil Engineering', 'Structural Design', 'Site Supervision', 'AutoCAD']
    },
    {
      title: 'Quantity Surveyor/Estate Manager (NYSC)',
      dept: 'Engineering',
      profile: 'Bachelors degree in quantity survey/Estate manager',
      responsibility: 'Operate physical asset management',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Quantity Surveying', 'Cost Estimation', 'Asset Management', 'Valuation']
    },
    {
      title: 'Journalist (NYSC)',
      dept: 'Marketing',
      profile: 'Bachelors degree in journalism',
      responsibility: 'Operate junction activities',
      ppaLocation: 'LGA Retail',
      countPerLocation: 2,
      locationsCount: 21,
      totalCount: 42,
      skills: ['Journalism', 'Reporting', 'Content Writing', 'Interviewing', 'Media Relations']
    },
    {
      title: 'Mass Communicator (NYSC)',
      dept: 'Marketing',
      profile: 'Bachelors degree in mass communication',
      responsibility: 'Operate communication and engagement activities',
      ppaLocation: 'State',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Mass Communication', 'Public Relations', 'Content Strategy', 'Corporate Communication']
    },
    {
      title: 'Social Media Executive (NYSC)',
      dept: 'Marketing',
      profile: 'Bachelors degree + demonstrable experience in social media creation and management',
      responsibility: 'Operate Discover and mainstream Social Media',
      ppaLocation: 'State',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Social Media Marketing', 'Content Creation', 'SEO', 'Brand Engagement', 'Analytics']
    },
    {
      title: 'Doctor (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in medicine',
      responsibility: 'Manage clinic and wellness',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Medicine', 'Patient Care', 'Diagnostics', 'Clinical Wellness', 'Healthcare Administration']
    },
    {
      title: 'Nurse (NYSC)',
      dept: 'Operations',
      profile: 'Bachelors degree in nursing',
      responsibility: 'Operate clinic and wellness',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Nursing', 'First Aid', 'Patient Monitoring', 'Clinical Care', 'Triage']
    },
    {
      title: 'Accountant (NYSC)',
      dept: 'Finance',
      profile: 'Bachelors degree in accounting',
      responsibility: 'Operate accounting and book keeping',
      ppaLocation: 'Cluster/LGA Retail',
      countPerLocation: 2,
      locationsCount: 21,
      totalCount: 42,
      skills: ['Accounting', 'Bookkeeping', 'Financial Reporting', 'Excel', 'Taxation']
    },
    {
      title: 'Finance Executive (NYSC)',
      dept: 'Finance',
      profile: 'Bachelors degree in finance',
      responsibility: 'Operate finance and asset management',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['Corporate Finance', 'Asset Management', 'Budgeting', 'Risk Analysis']
    },
    {
      title: 'Business Administrator/Retail Manager (NYSC)',
      dept: 'Sales',
      profile: 'Bachelors degree + demonstrable experience in business and retail management',
      responsibility: 'Operate Farm Tinder',
      ppaLocation: 'LGA Retail',
      countPerLocation: 2,
      locationsCount: 21,
      totalCount: 42,
      skills: ['Business Administration', 'Retail Management', 'Sales Strategy', 'Team Leadership', 'Operations']
    },
    {
      title: 'Learning Management Executive (NYSC)',
      dept: 'Human Resources',
      profile: 'Bachelors degree in education',
      responsibility: 'Operate YRP',
      ppaLocation: 'Cluster',
      countPerLocation: 2,
      locationsCount: 1,
      totalCount: 2,
      skills: ['LMS Admin', 'Training & Development', 'Instructional Design', 'Presentation', 'HR Admin']
    }
  ];

  for (const item of nyscJobs) {
    const description = `We are looking for an energetic and qualified NYSC Corps Member to join us as an **${item.title}**.

### NYSC PPA Details
* **Primary Place of Assignment (PPA) Location Type**: ${item.ppaLocation}
* **Positions per Location**: ${item.countPerLocation}
* **Number of Active Locations**: ${item.locationsCount}
* **Total Openings Across Locations**: ${item.totalCount}
* **Opportunity to Earn**: Performance-Based Bonuses

### Role Summary
In this role, you will be deployed to one of our active PPA locations to oversee and execute core tasks. The primary responsibility for this position is to **${item.responsibility.toLowerCase()}**. You will collaborate with supervisors and team members to ensure operational targets are achieved.`;

    const responsibilities = `- Lead and execute key activities related to: "${item.responsibility}"
- Collaborate with supervisors to monitor and document progress
- Maintain detailed logs, reports, and operational records for your location
- Adhere to corporate safety and operations guidelines
- Support local administrative tasks and team activities as assigned`;

    const requirements = `- Must be a currently serving NYSC Corps Member in Nigeria (or about to be deployed)
- ${item.profile}
- Excellent verbal and written communication skills
- High level of responsibility, punctuality, and ability to work in team environments
- Basic proficiency with digital tools and databases`;

    const jobPayload = {
      title: item.title,
      department_id: getDeptId(item.dept),
      employment_type: 'internship', // NYSC placements are internships/contract roles
      experience_level: 'entry',
      location: 'Various Locations, Nigeria',
      remote: false,
      salary_min: 50000,
      salary_max: 50000,
      description: description,
      responsibilities: responsibilities,
      requirements: requirements,
      skills_required: item.skills,
      status: 'published',
      created_by: recruiter.id
    };

    // Check if job exists
    const { data: existing } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('title', jobPayload.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Job "${jobPayload.title}" already exists. Updating...`);
      const { error } = await supabaseAdmin
        .from('jobs')
        .update(jobPayload)
        .eq('id', existing[0].id);
      if (error) console.error(`Error updating "${jobPayload.title}":`, error.message);
    } else {
      console.log(`Job "${jobPayload.title}" not found. Inserting...`);
      const { error } = await supabaseAdmin
        .from('jobs')
        .insert(jobPayload);
      if (error) console.error(`Error inserting "${jobPayload.title}":`, error.message);
    }
  }

  console.log('\nNYSC Jobs seeding finished successfully.');
}

seedNYSCJobs();
