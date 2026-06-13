export interface Job {
  id: string;
  title: string;
  department_id: string;
  employment_type: string;
  experience_level: string;
  location: string;
  remote: boolean;
  salary_min: number;
  salary_max: number;
  description: string;
  responsibilities: string;
  requirements: string;
  skills_required: string[];
  status: string;
  created_by: string;
  created_at: string;
  department?: { name: string };
}

export const MOCK_DEPARTMENTS = [
  { id: 'dept-eng', name: 'Engineering' },
  { id: 'dept-des', name: 'Design' },
  { id: 'dept-pm', name: 'Product' }
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'AI Software Engineer',
    department_id: 'dept-eng',
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
    created_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    department: { name: 'Engineering' }
  },
  {
    id: 'job-2',
    title: 'Senior Product Designer',
    department_id: 'dept-des',
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
    created_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    department: { name: 'Design' }
  }
];

export const MOCK_INTERVIEWS = [
  {
    id: 'int-1',
    job_id: 'job-1',
    candidate_id: '33333333-3333-3333-3333-333333333333',
    status: 'pending',
    job: MOCK_JOBS[0]
  }
];

export const MOCK_INTERVIEW_QUESTIONS = {
  'job-1': [
    "Welcome! To kick off this AI Software Engineer interview, could you share your experience integrating LLMs or building AI-driven systems in software projects?",
    "That is insightful. When working with LLMs, prompt stability is critical. How do you structure prompts to ensure reliable JSON outputs in production?",
    "Great! Let's talk system design. How would you design a scalable caching mechanism for LLM responses to reduce token costs?",
    "Excellent. RAG (Retrieval-Augmented Generation) is highly useful. How do you handle document chunking and metadata filtering to retrieve the most relevant context?",
    "Final question: How do you stay up-to-date with new models and paradigms in this fast-moving AI landscape?"
  ],
  'job-2': [
    "Welcome! Let's start with your experience designing B2B SaaS dashboards. What is your process for balancing dense data displays with clean visual layouts?",
    "Interesting. How do you organize and scale components in a shared Figma design system for multiple designers and developers?",
    "Great. Can you walk me through a design decision you made where user testing data conflicted with your initial instinct?",
    "Awesome. How do you collaborate with software engineers to ensure layout integrity and CSS variables match your styling tokens?",
    "Final question: What draws you to designing internal talent platforms, and what is the biggest UX opportunity in recruitment today?"
  ]
};
