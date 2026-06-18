"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  FileText, 
  Mic, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  Brain,
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  Lock
} from "lucide-react";

export function LandingClient() {
  const [activeFeature, setActiveFeature] = useState(0);

  const slides = [
    "/images/slide1.png",
    "/images/slide2.png",
    "/images/slide3.png",
    "/images/slide4.png"
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: "Intelligent Resume Screening",
      description: "Our advanced parser extracts skills, experience levels, and qualifications from candidate CVs, matching them against detailed job descriptions in seconds.",
      icon: FileText,
      metric: "70% Time Saved",
      details: ["Automatic skill mapping", "Experience relevance analysis", "Strengths & weaknesses reports"],
      color: "from-emerald-500/20 to-teal-500/20",
      accent: "#046C44"
    },
    {
      title: "Conversational AI Voice Interview",
      description: "A dynamic, speech-to-text verbal screening that mimics a natural human recruiter. Questions adapt in real-time based on the candidate's CV and previous answers.",
      icon: Mic,
      metric: "Voice-First Security",
      details: ["Real-time transcription", "Question-level countdown timers", "Prevents cheating & copy-pasting"],
      color: "from-purple-500/20 to-indigo-500/20",
      accent: "#7356BF"
    },
    {
      title: "Multi-Dimensional Evaluation",
      description: "AI grades candidates across three core pillars: Technical Fit, Communication Quality, and Problem Solving capability, generating transparent rankings.",
      icon: Brain,
      metric: "Bias-Free Scoring",
      details: ["Transparent scoring breakdown", "Comprehensive candidate profiles", "Recruiter pipeline overview"],
      color: "from-blue-500/20 to-cyan-500/20",
      accent: "#0284C7"
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Candidate Submits Application",
      description: "Aspiring talent uploads their resume and links their portfolio to target roles."
    },
    {
      num: "02",
      title: "AI Analysis & Initial Scoring",
      description: "The screening engine extracts competencies and awards a match percentage."
    },
    {
      num: "03",
      title: "Conversational Voice Interview",
      description: "Candidates answer AI-generated verbal questions, transcribed live under time limits."
    },
    {
      num: "04",
      title: "Recruiter Verdict & Pipeline",
      description: "HR reviews dynamic candidate scorecards, transcripts, and final fit recommendations."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-[#0D1F17] overflow-x-hidden selection:bg-[#046C44] selection:text-white">
      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 overflow-hidden rounded-lg bg-[#046C44]/10 flex items-center justify-center">
                <Image 
                  src="/logo.webp" 
                  alt="TAO Logo" 
                  width={36} 
                  height={36} 
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#0D1F17] flex items-center gap-1.5">
                TAO <span className="text-[#046C44] font-medium text-sm px-2 py-0.5 rounded-full bg-[#E8F5EE]">Recruit AI</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-[#6B7C75] hover:text-[#046C44] transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-[#6B7C75] hover:text-[#046C44] transition-colors">How It Works</a>
              <Link href="/jobs" className="text-sm font-medium text-[#6B7C75] hover:text-[#046C44] transition-colors">Browse Jobs</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-[#046C44] hover:text-[#035a38] transition-colors px-3 py-2 rounded-md hover:bg-[#E8F5EE]"
            >
              Sign In
            </Link>
            <Link 
              href="/jobs" 
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#046C44] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#035a38] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Apply for Jobs
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden bg-slate-950 text-white">
        
        {/* Slideshow background spanning the entire hero section */}
        <div className="absolute inset-0 z-0">
          {slides.map((src, index) => (
            <motion.div
              key={src}
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentSlide ? 1 : 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0"
            >
              <Image
                src={src}
                alt={`TAO Agriculture Background ${index + 1}`}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
              />
            </motion.div>
          ))}
          {/* Visual overlays: Soft gradient from left (scrim for text) to transparent right, allowing the photo to remain bright and clear */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#046C44]/15 via-transparent to-[#7356BF]/10 mix-blend-color z-10" />
        </div>
        
        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-white/10 backdrop-blur-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Intelligent Recruitment for the Modern Workforce
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]"
              >
                The Intelligent Option for <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-200 to-purple-300 bg-clip-text text-transparent">
                  Agricultural Talent
                </span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mx-auto lg:mx-0 max-w-lg text-lg text-slate-300 leading-relaxed"
              >
                Reduce HR workload and scale hiring. TAO Recruit AI leverages smart resume parsing, natural conversational voice screening, and objective ranking matrices.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
              >
                <Link 
                  href="/jobs" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#046C44] px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-950/20 hover:bg-[#035a38] transition-all hover:scale-[1.02]"
                >
                  Explore Jobs <Briefcase className="h-5 w-5" />
                </Link>
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/20 transition-all backdrop-blur-sm shadow-sm"
                >
                  Recruiter Portal <ArrowRight className="h-5 w-5 text-slate-300" />
                </Link>
              </motion.div>
            </div>

            {/* Right Column: High-fidelity Interactive Mockup floating over full slideshow background */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-6 relative flex justify-center items-center"
            >
              {/* Glassmorphic Candidate Card Overlay */}
              <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-[#E8F5EE]/80 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-[#046C44] animate-pulse" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#7356BF]/10 flex items-center justify-center font-bold text-[#7356BF] text-sm flex-shrink-0">
                    AB
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Adegoke Babatunde</h3>
                    <p className="text-[10px] text-[#6B7C75]">Candidate for Agro-Logistics Officer</p>
                  </div>
                </div>

                {/* Score section */}
                <div className="mt-4 flex items-center justify-between border-y border-slate-100 py-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[#6B7C75] block">AI Match Score</span>
                    <span className="text-xl font-extrabold text-[#046C44]">87%</span>
                  </div>
                  
                  {/* Gauge */}
                  <div className="relative h-11 w-11">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <motion.path
                        className="text-[#046C44]"
                        strokeWidth="3.5"
                        strokeDasharray="87, 100"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: "87, 100" }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-700">
                      Match
                    </div>
                  </div>
                </div>

                {/* Extracted skills tags */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#6B7C75] block">Core Competencies</span>
                  <div className="flex flex-wrap gap-1">
                    {["Precision Farming", "Agro-Analytics", "Supply Logistics", "Farm Ops"].map((tag, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#E8F5EE] text-[#046C44] border border-[#046C44]/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Speech Interview Summary */}
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7356BF]">
                    <Mic className="h-3 w-3" />
                    AI Interview Assessment
                  </div>
                  <p className="text-[10px] leading-relaxed text-[#6B7C75]">
                    "Demonstrated outstanding grasp of warehouse temperature controls and seasonal crop storage routing. Spoke clearly under countdown time limits."
                  </p>
                </div>
              </div>
            </motion.div>
            
          </div>
        </div>
      </section>

      {/* ── Stats & Impact Section ── */}
      <section className="bg-slate-900 py-12 text-white relative">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div className="space-y-1.5">
              <div className="text-4xl md:text-5xl font-black text-[#E8F5EE]">70%</div>
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Screening Time Saved</p>
            </div>
            <div className="space-y-1.5 border-t sm:border-t-0 sm:border-x border-slate-800 py-6 sm:py-0">
              <div className="text-4xl md:text-5xl font-black text-[#E8F5EE]">Objective</div>
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Algorithmic Resume Fit</p>
            </div>
            <div className="space-y-1.5">
              <div className="text-4xl md:text-5xl font-black text-[#E8F5EE]">Instant</div>
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Speech-to-Text Appraisals</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Features Section ── */}
      <section id="features" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-base font-semibold text-[#046C44] uppercase tracking-wider">Intelligent Architecture</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
              Fully Automated Recruitment Pipeline
            </p>
            <p className="text-base text-[#6B7C75]">
              Say goodbye to administrative screening bottlenecks. Our platform uses tailored AI modules to evaluate applicants comprehensively.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-16 items-center">
            {/* Feature Selectors */}
            <div className="lg:col-span-5 space-y-3">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                const isActive = activeFeature === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveFeature(idx)}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                      isActive 
                        ? "bg-slate-50 border-slate-200 shadow-sm" 
                        : "border-transparent hover:bg-slate-50/50"
                    }`}
                  >
                    <div 
                      className="p-2.5 rounded-lg flex-shrink-0"
                      style={{ 
                        backgroundColor: isActive ? `${feat.accent}12` : '#F1F5F3',
                        color: isActive ? feat.accent : '#6B7C75'
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-base transition-colors ${isActive ? 'text-slate-900' : 'text-[#6B7C75]'}`}>
                        {feat.title}
                      </h3>
                      <p className="text-xs text-[#6B7C75] mt-1 line-clamp-2">
                        {feat.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feature Details Viewer */}
            <div className="lg:col-span-7">
              <motion.div 
                key={activeFeature}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl bg-gradient-to-br ${features[activeFeature].color} border border-slate-100 p-8 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 shadow-sm text-slate-800">
                    {features[activeFeature].metric}
                  </span>
                  <Sparkles className="h-5 w-5 text-slate-600 opacity-60" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mt-6">
                  {features[activeFeature].title}
                </h3>
                <p className="text-sm text-[#6B7C75] leading-relaxed mt-2.5">
                  {features[activeFeature].description}
                </p>

                <div className="mt-6 space-y-3 bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/60">
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider block">Key Capabilities</span>
                  <ul className="space-y-2.5">
                    {features[activeFeature].details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-800 font-medium">
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#046C44] flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-y border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-base font-semibold text-[#046C44] uppercase tracking-wider">Hiring Streamlined</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
              How TAO Recruit AI Operates
            </p>
            <p className="text-sm text-[#6B7C75]">
              A step-by-step layout showing the candidate assessment process, ensuring objective and prompt scoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-black text-[#046C44]/15 absolute top-4 right-4">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-2 pr-6">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#6B7C75] leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>
                
                {idx < 3 && (
                  <div className="hidden lg:flex items-center justify-end text-slate-300 mt-4">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to Action Splitted Grid ── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Candidate Box */}
            <div className="relative rounded-2xl bg-[#E8F5EE] border border-[#046C44]/10 p-8 md:p-10 flex flex-col justify-between items-start overflow-hidden">
              <div className="space-y-4 relative z-10">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#046C44]">
                  <Users className="h-4 w-4" /> For Candidates
                </span>
                <h3 className="text-2xl font-bold text-slate-950">
                  Ready to start your journey in agricultural excellence?
                </h3>
                <p className="text-sm text-[#6B7C75] leading-relaxed max-w-md">
                  Explore high-impact careers under the TAO umbrella. Secure a role, upload your resume, and complete an objective AI interview today.
                </p>
              </div>

              <div className="mt-8 relative z-10 w-full">
                <Link 
                  href="/jobs" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#046C44] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#035a38] transition-all"
                >
                  Browse Job Openings <Briefcase className="h-4.5 w-4.5" />
                </Link>
              </div>
            </div>

            {/* Recruiter Box */}
            <div className="relative rounded-2xl bg-purple-50 border border-purple-200/60 p-8 md:p-10 flex flex-col justify-between items-start overflow-hidden">
              <div className="space-y-4 relative z-10">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#7356BF]">
                  <Lock className="h-4 w-4" /> For HR & Recruiters
                </span>
                <h3 className="text-2xl font-bold text-slate-950">
                  Eliminate resume screening fatigue immediately.
                </h3>
                <p className="text-sm text-[#6B7C75] leading-relaxed max-w-md">
                  Log in to manage open listings, review real-time AI-parsed metrics, and listen to automatically transcribed dynamic audio interviews.
                </p>
              </div>

              <div className="mt-8 relative z-10 w-full">
                <Link 
                  href="/login" 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#7356BF] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5C3EAB] transition-all"
                >
                  Sign In to Workspace <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer Section ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-16 text-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo.webp" 
                  alt="TAO Logo" 
                  width={32} 
                  height={32} 
                  className="object-contain"
                />
                <span className="text-lg font-bold tracking-tight text-slate-950">TAO Recruit AI</span>
              </div>
              <p className="text-xs text-[#6B7C75] max-w-sm leading-relaxed">
                Part of the Agricultural Option (TAO), building pathways to make agriculture viable and fulfilling for young people across Nigeria.
              </p>
              <div className="text-xs font-medium text-slate-500">
                Contact: <a href="mailto:info@tao.com.ng" className="text-[#046C44] hover:underline">info@tao.com.ng</a>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">Quick Navigation</h4>
              <ul className="space-y-2">
                <li><Link href="/jobs" className="text-xs text-[#6B7C75] hover:text-[#046C44] transition-colors">Find Jobs</Link></li>
                <li><Link href="/login" className="text-xs text-[#6B7C75] hover:text-[#046C44] transition-colors">Sign In</Link></li>
                <li><a href="#features" className="text-xs text-[#6B7C75] hover:text-[#046C44] transition-colors">Key Features</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-950 uppercase tracking-wider">About TAO</h4>
              <ul className="space-y-2">
                <li><a target="_blank" href="https://www.tao.com.ng" className="text-xs text-[#6B7C75] hover:text-[#046C44] transition-colors">TAO Corporate Website</a></li>
                <li><a target="_blank" href="https://center.tao.com.ng" className="text-xs text-[#6B7C75] hover:text-[#046C44] transition-colors">TAO Apps Hub</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[#6B7C75]">
              &copy; {new Date().getFullYear()} The Agriculture Option. All rights reserved.
            </p>
            <p className="text-[10px] text-slate-400">
              Developed using the UI/UX Pro Max guidelines.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
