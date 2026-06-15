const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.match(/^([^=]+)=(.*)$/);
    if (parts) {
      process.env[parts[1].trim()] = parts[2].trim();
    }
  });
}

// Check environment variables
console.log('NVIDIA_API_KEY (from env):', process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.substring(0, 12) + '...' : 'undefined');

// Import the TypeScript file logic compiled or directly using tsx
// Since we have ts-node / tsx, we can run it or use a compiled version.
// Let's write a JS-only mock of the analyzeResume function from lib/ai.ts to make sure we run identical code
const { analyzeResume } = require('./lib/ai');

const resumeText = `John Doe
johndoe@example.com
+1 (555) 019-9999
San Francisco, CA

Education:
B.S. in Computer Science, Stanford University (2022)

Experience:
Software Engineer Intern at Google (Summer 2021)
- Built search features using React and TypeScript.
- Wrote tests in Jest.

Skills:
React, TypeScript, JavaScript, Node.js, HTML, CSS`;

async function test() {
  console.log('Running analyzeResume...');
  try {
    const result = await analyzeResume(
      resumeText,
      'Software Engineer',
      'We are looking for a Software Engineer proficient in React and TypeScript.',
      'React, TypeScript, Node.js'
    );
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Failed to run analyzeResume:', err);
  }
}

test();
