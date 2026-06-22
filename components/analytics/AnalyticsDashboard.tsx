"use client";

import { KpiCards } from "./KpiCards";
import { FunnelChart } from "./FunnelChart";
import { TrendChart } from "./TrendChart";
import { JobPerformanceTable } from "./JobPerformanceTable";
import { AIInsightsPanel } from "./AIInsightsPanel";
import { SkillsChart } from "./SkillsChart";
import { EducationChart } from "./EducationChart";
import { ExperienceChart } from "./ExperienceChart";
import { RecruiterLeaderboard } from "./RecruiterLeaderboard";
import { QualityIndex } from "./QualityIndex";
import { AIRecommendations } from "./AIRecommendations";
import {
  BarChart2,
  RefreshCw,
  GitMerge,
  Brain,
  Briefcase,
  BookOpen,
  Sparkles,
  Trophy,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  overview: {
    totalApplicants: number;
    openJobs: number;
    inPipeline: { screening: number; interview: number; evaluation: number; shortlisted: number; total: number };
    hired: number;
    rejected: number;
    avgAiScore: number;
  };
  funnel: { stage: string; count: number; conversion: number; dropOff: number }[];
  trend: { date: string; count: number }[];
  jobsAnalytics: { id: string; title: string; department: string; applicants: number; qualified: number; interviewed: number; hired: number; avgAiScore: number }[];
  aiInsights: { avgScore: number; maxScore: number; minScore: number; distribution: { range: string; count: number; percentage: number }[]; totalAnalyzed: number };
  topSkills: { skill: string; count: number; percentage: number }[];
  experience: { label: string; count: number }[];
  education: { degrees: { degree: string; count: number; percentage: number }[]; levels: { level: string; count: number; percentage: number }[] };
  recruiters: { id: string; name: string; email: string; jobsPosted: number; applicationsReviewed: number; interviewed: number; hired: number }[];
  qualityDist: { Excellent: number; Good: number; Average: number; Weak: number };
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="p-2 rounded-xl bg-[var(--color-brand-light)] shrink-0 mt-0.5">
        <Icon size={16} className="text-[var(--color-brand)]" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--color-foreground)] tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-[var(--color-border)] my-10" />;
}

export function AnalyticsDashboard(props: Props) {
  const { overview, funnel, trend, jobsAnalytics, aiInsights, topSkills, experience, education, recruiters, qualityDist } = props;

  const downloadCsvReport = () => {
    let csv = "";
    const addRow = (cells: string[]) => {
      csv += cells.map(c => {
        const str = String(c ?? "").replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(",") + "\n";
    };

    // Document header
    addRow(["TAO RECRUIT AI - RECRUITMENT ANALYTICS REPORT"]);
    addRow([`Generated on: ${new Date().toLocaleString()}`]);
    addRow([]);

    // 1. Overview KPIs
    addRow(["1. OVERVIEW PERFORMANCE INDICATORS"]);
    addRow(["Metric", "Value"]);
    addRow(["Total Applicants", String(overview.totalApplicants)]);
    addRow(["Open Job Openings", String(overview.openJobs)]);
    addRow(["Candidates in Pipeline", String(overview.inPipeline.total)]);
    addRow(["Hired Candidates", String(overview.hired)]);
    addRow(["Rejected Candidates", String(overview.rejected)]);
    addRow(["Average AI Screening Score", `${overview.avgAiScore}%`]);
    addRow([]);

    // 2. Funnel Stages
    addRow(["2. RECRUITMENT FUNNEL STAGES"]);
    addRow(["Stage", "Candidate Count", "Conversion Rate", "Drop-off Rate"]);
    funnel.forEach(f => {
      addRow([f.stage, String(f.count), `${f.conversion}%`, `${f.dropOff}%`]);
    });
    addRow([]);

    // 3. Job Performance Table
    addRow(["3. JOB PERFORMANCE ANALYTICS"]);
    addRow(["Job Title", "Department", "Applicants", "Qualified Candidates", "Interviewed", "Hired", "Average AI Score"]);
    jobsAnalytics.forEach(j => {
      addRow([j.title, j.department, String(j.applicants), String(j.qualified), String(j.interviewed), String(j.hired), `${j.avgAiScore}%`]);
    });
    addRow([]);

    // 4. Recruiter Leaderboard
    addRow(["4. RECRUITER PERFORMANCE LEADERBOARD"]);
    addRow(["Recruiter Name", "Email Address", "Jobs Posted", "Reviews Done", "Candidates Interviewed", "Hired"]);
    recruiters.forEach(r => {
      addRow([r.name, r.email, String(r.jobsPosted), String(r.applicationsReviewed), String(r.interviewed), String(r.hired)]);
    });
    addRow([]);

    // 5. Talent Pool Skills
    addRow(["5. TALENT POOL TOP SKILLS"]);
    addRow(["Skill Name", "Candidate Match Count", "Percentage Match"]);
    topSkills.forEach(s => {
      addRow([s.skill, String(s.count), `${s.percentage}%`]);
    });
    addRow([]);

    // 6. Experience Distribution
    addRow(["6. TALENT POOL EXPERIENCE DISTRIBUTION"]);
    addRow(["Experience Range", "Candidate Count"]);
    experience.forEach(e => {
      addRow([e.label, String(e.count)]);
    });
    addRow([]);

    // 7. Education Distribution
    addRow(["7. TALENT POOL EDUCATION LEVELS"]);
    addRow(["Degree Level", "Candidate Count", "Percentage"]);
    education.levels.forEach(l => {
      addRow([l.level, String(l.count), `${l.percentage}%`]);
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TAO_Recruitment_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-0 animate-fade-in pb-16">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-[var(--color-brand-light)]">
              <BarChart2 size={18} className="text-[var(--color-brand)]" strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)] tracking-tight">
              Recruitment Analytics
            </h1>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] ml-[3.25rem]">
            Real-time visibility into your recruitment performance, pipeline health, and hiring efficiency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsvReport}
            className="flex items-center gap-2 text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand)]/90 border-none font-medium transition-all"
          >
            <Download size={13} />
            Export CSV (Excel)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Section 1: Overview KPIs ─────────────────────────── */}
      <section aria-label="Overview">
        <SectionHeader
          icon={BarChart2}
          title="Overview"
          description="Key recruitment metrics at a glance"
        />
        <KpiCards overview={overview} />
      </section>

      <SectionDivider />

      {/* ── Section 2: Pipeline & Activity ───────────────────── */}
      <section aria-label="Pipeline and Activity">
        <SectionHeader
          icon={GitMerge}
          title="Pipeline & Activity"
          description="Track how candidates progress through each stage and monitor application volume over time"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FunnelChart funnel={funnel} />
          <TrendChart initialTrend={trend} />
        </div>
      </section>

      <SectionDivider />

      {/* ── Section 3: AI Screening & Quality ────────────────── */}
      <section aria-label="AI Screening and Quality">
        <SectionHeader
          icon={Brain}
          title="AI Screening & Candidate Quality"
          description="AI-generated CV analysis scores, distribution patterns, and the TAO Quality Index"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AIInsightsPanel aiInsights={aiInsights} />
          <QualityIndex qualityDist={qualityDist} totalAnalyzed={aiInsights.totalAnalyzed} />
        </div>
      </section>

      <SectionDivider />

      {/* ── Section 4: Talent Pool Insights ──────────────────── */}
      <section aria-label="Talent Pool Insights">
        <SectionHeader
          icon={BookOpen}
          title="Talent Pool Insights"
          description="Skills, experience levels, and educational backgrounds extracted from AI-analyzed CVs"
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <ExperienceChart experience={experience} />
          </div>
          <div className="xl:col-span-1">
            <EducationChart education={education} />
          </div>
          <div className="xl:col-span-1">
            <SkillsChart topSkills={topSkills} />
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── Section 5: Job Performance ────────────────────────── */}
      <section aria-label="Job Performance">
        <SectionHeader
          icon={Briefcase}
          title="Job Performance Analytics"
          description="Compare applicant volume, qualification rates, and AI scores across all your open roles"
        />
        <JobPerformanceTable jobs={jobsAnalytics} />
      </section>

      <SectionDivider />

      {/* ── Section 6: Team Performance ───────────────────────── */}
      <section aria-label="Team Performance">
        <SectionHeader
          icon={Trophy}
          title="Recruiter Performance"
          description="Leaderboard showing recruiter activity — jobs posted, applications reviewed, and hires made"
        />
        <div className="max-w-2xl">
          <RecruiterLeaderboard recruiters={recruiters} />
        </div>
      </section>

      <SectionDivider />

      {/* ── Section 7: AI Recommendations ────────────────────── */}
      <section aria-label="AI Recommendations">
        <SectionHeader
          icon={Sparkles}
          title="AI Recommendations"
          description="Automatically generated insights based on patterns in your recruitment data"
        />
        <AIRecommendations
          overview={overview}
          funnel={funnel}
          topSkills={topSkills}
          jobsAnalytics={jobsAnalytics}
          qualityDist={qualityDist}
        />
      </section>

    </div>
  );
}
