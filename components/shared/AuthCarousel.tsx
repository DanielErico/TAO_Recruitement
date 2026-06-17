"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const SLIDES = [
  {
    image: "/images/slide1.png",
    title: "Smarter hiring starts here",
    description: "TAO Recruit AI automates the heavy lifting so your team can focus on finding the right people."
  },
  {
    image: "/images/slide2.png",
    title: "AI-Powered CV Analysis",
    description: "Instantly parse resumes, extract skills, and evaluate candidate-job fit with advanced AI models."
  },
  {
    image: "/images/slide3.png",
    title: "Evolutionary Assessments",
    description: "Conduct structured interactive screenings and generate detailed evaluation reports automatically."
  },
  {
    image: "/images/slide4.png",
    title: "Secure & Fair Interviews",
    description: "Ensure candidate assessment integrity with built-in focus tracking and tab-switch detection."
  }
];

export function AuthCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % SLIDES.length);
    }, 6000); // Change slide every 6 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col h-full w-full p-10 text-white relative overflow-hidden bg-[#023823]">
      {/* 1. Ken Burns background image with Framer Motion */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1.06 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{
              scale: { duration: 6, ease: "linear" },
              opacity: { duration: 1.2, ease: "easeInOut" }
            }}
            className="absolute inset-0 w-full h-full"
          >
            <Image
              src={SLIDES[activeIdx].image}
              alt={SLIDES[activeIdx].title}
              fill
              sizes="50vw"
              className="object-cover pointer-events-none brightness-[0.7] contrast-[1.05]"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Premium Rich Gradient Overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#023823]/95 via-[#046c44]/35 to-[#023823]/40" />
      <div className="absolute inset-0 z-10 bg-radial-gradient from-transparent to-[#023823]/70 opacity-80" />

      {/* Subtle dotted pattern overlay for additional texture */}
      <div 
        className="absolute inset-0 z-10 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* 3. Logo in Top Corner */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <Image
            src="/logo.webp"
            alt="TAO"
            width={72}
            height={28}
            className="brightness-0 invert"
            priority
          />
        </div>
        <span className="text-[10px] uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full text-emerald-200 font-semibold border border-white/5">
          Enterprise
        </span>
      </div>

      {/* 4. Carousel Text Content & Slide Indicators */}
      <div className="relative z-20 mt-auto space-y-8">
        <div className="min-h-[140px] flex flex-col justify-end">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={activeIdx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-3"
            >
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-sm font-sans">
                {SLIDES[activeIdx].title}
              </h2>
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal opacity-90">
                &ldquo;{SLIDES[activeIdx].description}&rdquo;
              </p>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        {/* Progress Dots Indicator */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer"
              style={{
                width: activeIdx === idx ? "24px" : "6px",
                backgroundColor: activeIdx === idx ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)"
              }}
              aria-label={`Go to slide ${idx + 1}`}
            >
              {activeIdx === idx && (
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 6, ease: "linear" }}
                  className="h-full bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
