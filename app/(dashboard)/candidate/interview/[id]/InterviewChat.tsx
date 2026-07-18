"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, CheckCircle2, Clock, Info, Mic, MicOff, AlertCircle } from "lucide-react";

interface InterviewChatProps {
  applicationId: string;
  job: {
    id: string;
    title: string;
    location: string;
    remote: boolean;
    department?: { name: string };
  };
  candidateId: string;
}

export function InterviewChat({ applicationId, job, candidateId }: InterviewChatProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<"intro" | "chat" | "submitting" | "success">("intro");
  const [messages, setMessages] = useState<{ sender: "ai" | "candidate"; text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [answers, setAnswers] = useState<{ question: string; response: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Voice & Timer states
  const [isListening, setIsListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [recommendedSeconds, setRecommendedSeconds] = useState<number>(60);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  // Detect iOS/Safari ONCE on mount via a ref — avoids SSR issues (navigator is
  // undefined on the server) and prevents re-computation on every render.
  const isMobileSafariRef = useRef(false);
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    isMobileSafariRef.current = ios || safari;
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  // On iOS (continuous=false), tracks the current phrase in progress.
  // Only committed to finalTranscriptRef when onend fires (phrase complete).
  // This prevents the exponential repetition caused by interim results updating
  // the same result in place while we were treating them all as 'final'.
  const iosCurrentPhraseRef = useRef("");
  // Prevents iOS ghost onClick from double-firing toggleListening after onTouchEnd
  const touchHandledRef = useRef(false);

  // Keep refs of state to use in SpeechRecognition callback without re-binding
  const isListeningRef = useRef(isListening);
  const modeRef = useRef(mode);
  const isAiTypingRef = useRef(isAiTyping);
  const answersRef = useRef(answers);
  const currentInputRef = useRef(currentInput);
  const messagesRef = useRef(messages);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
    modeRef.current = mode;
    isAiTypingRef.current = isAiTyping;
  }, [isListening, mode, isAiTyping]);

  useEffect(() => {
    answersRef.current = answers;
    currentInputRef.current = currentInput;
    messagesRef.current = messages;
  }, [answers, currentInput, messages]);

  // Global Timer countdown hook
  useEffect(() => {
    if (mode !== "chat" || globalTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGlobalTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, globalTimeLeft]);

  async function handleGlobalTimeout() {
    setMode("submitting");
    const finalSpeech = currentInputRef.current.trim();
    let finalAnswers = [...answersRef.current];

    if (finalSpeech) {
      // Use messagesRef (not messages) to avoid stale closure in timer callback
      const aiMessages = messagesRef.current.filter((m) => m.sender === "ai");
      const currentQuestion = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : "Introduction";
      finalAnswers.push({ question: currentQuestion, response: finalSpeech });
    }

    if (finalAnswers.length === 0) {
      finalAnswers.push({
        question: "Introduction",
        response: "(No responses recorded within the 5-minute time limit)"
      });
    }

    finalTranscriptRef.current = "";
    iosCurrentPhraseRef.current = "";
    submitInterview(finalAnswers);
  }

  // Handle tab switch detection (anti-cheat)
  const handleTabSwitch = () => {
    if (document.visibilityState === "hidden") {
      console.warn("[Anti-Cheat] Tab switch detected! Force submitting interview.");
      stopListening();
      
      // Capture current input text (if any) as a final answer
      const finalSpeech = currentInputRef.current.trim();
      let finalAnswers = [...answersRef.current];
      
      if (finalSpeech) {
        const aiMessages = messagesRef.current.filter((m) => m.sender === "ai");
        const currentQuestion = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : "Introduction";
        finalAnswers.push({ question: currentQuestion, response: finalSpeech });
      }
      
      if (finalAnswers.length === 0) {
        finalAnswers.push({ 
          question: "Introduction", 
          response: "(No responses recorded before tab switch)" 
        });
      }

      // Add a final response note to answers indicating termination due to tab switch
      finalAnswers.push({
        question: "System Status Alert",
        response: "[INTERVIEW TERMINATED] The candidate switched tabs during this question. The interview was forced to end and submit."
      });

      finalTranscriptRef.current = "";
      iosCurrentPhraseRef.current = "";
      submitInterview(finalAnswers, true);
    }
  };

  // Anti-cheat tab-switching listener hook
  useEffect(() => {
    if (mode !== "chat") return;

    document.addEventListener("visibilitychange", handleTabSwitch);
    return () => {
      document.removeEventListener("visibilitychange", handleTabSwitch);
    };
  }, [mode]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      // Read from ref (set by the detection useEffect above)
      const onMobileSafari = isMobileSafariRef.current;

      // iOS/Safari does NOT support continuous mode reliably:
      // with continuous=true, the mic silently freezes on iOS.
      // Instead we set continuous=false on mobile Safari and
      // manually restart after each result in onend.
      rec.continuous = !onMobileSafari;
      rec.interimResults = true;
      rec.lang = "en-US";
      
      rec.onresult = (event: any) => {
        if (onMobileSafari) {
          // iOS/Safari fires multiple onresult events for the SAME phrase as it
          // refines its transcript (resultIndex stays 0, same result updates in place).
          // Accumulating these into finalTranscriptRef causes exponential repetition.
          // Fix: treat the latest transcript as the "current phrase in progress" only.
          // It gets committed to finalTranscriptRef once in onend (phrase complete).
          const latest = event.results[event.results.length - 1][0].transcript;
          iosCurrentPhraseRef.current = latest;
          const display = finalTranscriptRef.current
            ? finalTranscriptRef.current + " " + latest
            : latest;
          setCurrentInput(display.trim());
        } else {
          // Desktop / Android Chrome: use resultIndex to process only NEW results.
          // isFinal correctly marks phrase boundaries here.
          let newFinalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              newFinalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (newFinalTranscript) {
            finalTranscriptRef.current += newFinalTranscript;
          }

          const fullTranscript = (finalTranscriptRef.current + interimTranscript).trim();
          if (fullTranscript) {
            setCurrentInput(fullTranscript);
          }
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          const iosHint = onMobileSafari
            ? " On iPhone/iPad: go to Settings → Safari → Microphone and allow access. Also ensure Siri is enabled in Settings → Siri & Search."
            : "";
          setError(`Microphone permission was denied. Please allow microphone access in your browser settings.${iosHint}`);
          setIsListening(false);
          console.error("Speech recognition error: not-allowed");
        } else if (event.error === "no-speech") {
          // Normal silence event — onend will fire right after and handle restart.
          // No action needed here for any platform.
        } else if (event.error === "aborted") {
          // Fires when rec.stop() is called. State already updated by stopListening().
          console.warn("Speech recognition aborted (expected when stopping).");
        } else {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        }
      };

      rec.onend = () => {
        const shouldRestart =
          isListeningRef.current && modeRef.current === "chat" && !isAiTypingRef.current;

        if (onMobileSafari && shouldRestart) {
          // iOS: onend means the current phrase is complete. Commit it to finals
          // before restarting so the next phrase appends cleanly.
          const phrase = iosCurrentPhraseRef.current.trim();
          if (phrase) {
            finalTranscriptRef.current = finalTranscriptRef.current
              ? finalTranscriptRef.current + " " + phrase
              : phrase;
          }
          iosCurrentPhraseRef.current = "";
        } else if (onMobileSafari && !shouldRestart) {
          // Being stopped for submission — clear without committing (sendAnswer
          // already captured the displayed text as the answer).
          iosCurrentPhraseRef.current = "";
        }

        if (shouldRestart) {
          // Use 300ms delay on all platforms:
          // - iOS: prevents InvalidStateError on rapid restart
          // - Android: prevents re-processing of recently buffered mic audio
          //   which can cause the previous phrase to appear duplicated
          setTimeout(() => {
            try {
              rec.start();
            } catch (e) {
              console.warn("Failed to restart speech recognition:", e);
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
    } else {
      setSpeechSupported(false);
      const iosMsg = isMobileSafariRef.current
        ? "Please open this page in the Safari browser app on your iPhone or iPad to use voice input."
        : "Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.";
      setError(iosMsg);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (mode !== "chat" || isAiTyping || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, isAiTyping, timeLeft]);

  // Auto-start listening when AI stops typing, stop when AI is typing
  useEffect(() => {
    if (mode === "chat" && !isAiTyping && recognitionRef.current) {
      startListening();
    } else {
      stopListening();
    }
  }, [isAiTyping, mode]);

  function startListening() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (e: any) {
      // "InvalidStateError" means recognition is already running — safe to ignore
      if (e?.name !== "InvalidStateError") {
        console.warn("startListening error:", e);
      }
    }
  }

  function stopListening() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {
      // Already stopped — safe to ignore
    }
  }

  function toggleListening() {
    // On iOS, programmatic start() without a direct user gesture can be blocked.
    // The onClick/onTouchEnd handlers below count as a gesture so this is safe.
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  async function handleAutoSubmit() {
    // Timer expired - submit whatever is captured so far
    const finalSpeech = currentInput.trim() || "(No verbal response captured)";
    await sendAnswer(finalSpeech);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (isAiTyping || isPending) return;
    const finalSpeech = currentInput.trim() || "(No verbal response captured)";
    await sendAnswer(finalSpeech);
  }

  async function sendAnswer(text: string) {
    // Append candidate message
    setMessages((prev) => [...prev, { sender: "candidate", text }]);
    setCurrentInput("");
    stopListening();
    finalTranscriptRef.current = "";
    iosCurrentPhraseRef.current = "";

    // Determine the question being answered
    const aiMessages = messages.filter((m) => m.sender === "ai");
    const currentQuestion = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : "Introduction";

    // Save answer
    const newAnswers = [...answers, { question: currentQuestion, response: text }];
    setAnswers(newAnswers);

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);

    // Request next question
    await fetchNextQuestion(nextIndex, newAnswers, globalTimeLeft);
  }

  async function fetchNextQuestion(index: number, currentAnswers: typeof answers, currentGlobalTimeLeft: number) {
    setIsAiTyping(true);
    setError(null);
    try {
      const res = await fetch("/api/interviews/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          questionIndex: index,
          chatHistory: currentAnswers,
          globalTimeLeft: currentGlobalTimeLeft,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate interview question");
      }

      const data = await res.json();

      if (data.isComplete) {
        // Final Concluding message
        const finalMsg = data.question || "Thank you! I have gathered all necessary information. Submitting your interview responses...";
        setMessages((prev) => [...prev, { sender: "ai", text: finalMsg }]);
        setIsAiTyping(false);
        
        // Show concluding message in chat for 4 seconds so candidate can read it, then submit
        setTimeout(() => {
          setMode("submitting");
          submitInterview(currentAnswers);
        }, 4000);
      } else {
        if (data.question) {
          setMessages((prev) => [...prev, { sender: "ai", text: data.question }]);
          setTimeLeft(data.recommendedSeconds || 60);
          setRecommendedSeconds(data.recommendedSeconds || 60);
        } else {
          throw new Error("Empty question received");
        }
        setIsAiTyping(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Interviewer API error. Reconnecting with fallback questions...");
      setIsAiTyping(false);

      // Client-side fallback
      const fallback = generateFallbackInterviewQuestion(index);
      if (fallback.isComplete) {
        setMessages((prev) => [...prev, { sender: "ai", text: fallback.question }]);
        setTimeout(() => {
          setMode("submitting");
          submitInterview(currentAnswers);
        }, 4000);
      } else {
        setMessages((prev) => [...prev, { sender: "ai", text: fallback.question }]);
        setTimeLeft(fallback.recommendedSeconds);
        setRecommendedSeconds(fallback.recommendedSeconds);
      }
    }
  }

  function generateFallbackInterviewQuestion(index: number) {
    if (globalTimeLeft < 80) {
      return {
        question: "Thank you! Our 5-minute time limit is nearly up, so we'll stop here. Finalizing the interview and submitting your responses...",
        isComplete: true,
        recommendedSeconds: 30
      };
    }

    const defaults: Record<number, string> = {
      0: `Hi candidate, welcome to the screening interview. To start, could you introduce yourself and explain what interests you about this position?`,
      1: `Can you tell me about a challenging technical problem you solved recently and what technologies you used to resolve it?`,
      2: `How do you approach collaborating with team members and stakeholders when requirements are ambiguous?`,
      3: `In terms of your development process, what steps do you take to ensure code quality, testing, and reliability?`,
      4: `Finally, what is a new technology or methodology you've been learning recently, and how do you plan to apply it?`
    };

    const q = defaults[index];
    if (!q) {
      return {
        question: "Thank you! I have gathered all the necessary details. Submitting your interview responses now...",
        isComplete: true,
        recommendedSeconds: 30
      };
    }
    return {
      question: q,
      isComplete: false,
      recommendedSeconds: 60
    };
  }

  function submitInterview(finalAnswers: typeof answers, switchedTabs = false) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setMode("submitting");
    startTransition(async () => {
      try {
        setError(null);
        const start = startTime || new Date();

        const res = await fetch("/api/interviews/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            candidateId,
            answers: finalAnswers,
            startTime: start.toISOString(),
            switchedTabs
          })
        });

        if (!res.ok) {
          const errText = await res.json().catch(() => ({}));
          throw new Error(errText.error || "Failed to submit responses to database");
        }

        setMode("success");
      } catch (err: any) {
        console.error("Failed to submit interview:", err);
        isSubmittingRef.current = false;
        setError(err.message || "Something went wrong submitting your responses.");
        setMode("chat"); // Return to chat mode to show error
        setQuestionIndex(5);
      }
    });
  }

  function handleStart() {
    setStartTime(new Date());
    setMode("chat");
    setGlobalTimeLeft(300); // Reset global timer
    finalTranscriptRef.current = "";
    fetchNextQuestion(0, [], 300);
  }

  // ── Render Intro Mode ──
  if (mode === "intro") {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center text-[var(--color-brand)]">
            <Mic size={48} strokeWidth={1.5} className="animate-pulse" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              AI Voice Screening Interview
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              For the <strong className="text-[var(--color-foreground)]">{job.title}</strong> role
            </p>
          </div>

          <div className="border-t border-[var(--color-border)] pt-5 space-y-4 text-sm text-[var(--color-foreground)]">
            <div className="flex gap-2.5 items-start">
              <Mic size={16} className="text-[var(--color-brand)] mt-0.5" />
              <div>
                <strong className="block">Voice Input Only</strong>
                <span className="text-[var(--color-muted-foreground)]">Keyboard typing is completely disabled to ensure authenticity. Please answer by speaking clearly.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <Clock size={16} className="text-[var(--color-brand)] mt-0.5" />
              <div>
                <strong className="block">5-Minute Total Time Limit</strong>
                <span className="text-[var(--color-muted-foreground)]">The entire interview is limited to exactly 5 minutes total. The countdown will begin as soon as you start.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <Info size={16} className="text-[var(--color-brand)] mt-0.5" />
              <div>
                <strong className="block">Auto-Submission & Finalization</strong>
                <span className="text-[var(--color-muted-foreground)]">When the 5-minute limit expires, all your answers gathered so far will be automatically finalized and submitted to the recruiter.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start border-l-2 border-rose-500 pl-3 bg-rose-50/40 p-2.5 rounded-lg">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <strong className="block text-rose-700 text-xs">Tab Switching Prohibited</strong>
                <span className="text-[var(--color-muted-foreground)] text-xs">To ensure integrity, tab or window switching is strictly tracked. If you switch tabs, the interview will end and submit automatically, logging a tab-switching warning.</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleStart} className="w-full py-6 text-base shadow-sm">
              Start Voice Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render Submitting Mode ──
  if (mode === "submitting" || isPending) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-12 text-center space-y-4">
          <Loader2 size={36} className="animate-spin text-[var(--color-brand)] mx-auto" />
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Saving Responses & Scoring...</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Uploading your transcripts and running the TAO AI evaluation models. Please do not close this tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render Success Mode ──
  if (mode === "success") {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center text-[var(--color-brand)]">
            <CheckCircle2 size={56} strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Interview Completed!
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">
              Your voice responses have been transcribed and submitted successfully. Recruiter evaluation scoring has run.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <Button onClick={() => router.push("/candidate/applications")} className="w-full">
              Go to My Applications
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format global MM:SS time string
  const formatGlobalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate timer color configuration
  const globalProgressPercent = (globalTimeLeft / 300) * 100;
  const isGlobalTimeLow = globalTimeLeft <= 60;
  const isTimeLow = timeLeft <= 15;

  // ── Render Chat Mode ──
  return (
    <Card className="shadow-md flex flex-col h-[600px] relative overflow-hidden">
      {/* Dynamic Timer Progress Bar (Global Duration) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-border)] z-50">
        <div 
          className={`h-full transition-all duration-1000 ${
            globalTimeLeft <= 60 
              ? "bg-rose-500 animate-pulse" 
              : globalTimeLeft <= 120 
              ? "bg-amber-500" 
              : "bg-emerald-600"
          }`}
          style={{ width: `${globalProgressPercent}%` }}
        />
      </div>

      {/* Header */}
      <CardContent className="p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0 bg-white mt-1">
        <div>
          <h2 className="font-bold text-sm text-[var(--color-foreground)]">{job.title}</h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">AI Voice Technical Screening</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Global Timer Badge */}
          <div className={`text-xs font-semibold px-2 py-1 rounded-md border flex items-center gap-1.5 ${
            isGlobalTimeLow ? "border-rose-200 bg-rose-50 text-rose-600" : "border-[var(--color-border)] bg-slate-50 text-slate-700"
          }`}>
            <Clock size={12} className={isGlobalTimeLow ? "text-rose-500 animate-pulse" : "text-slate-500"} />
            <span className="font-mono">
              Total: {formatGlobalTime(globalTimeLeft)}
            </span>
          </div>

          {/* Question Pacing Badge */}
          <div className={`text-xs font-semibold px-2 py-1 rounded-md border flex items-center gap-1 ${
            isTimeLow ? "border-rose-100 bg-rose-50/50 text-rose-500" : "border-[var(--color-border)] bg-slate-50/30 text-slate-600"
          }`}>
            <span className="font-mono">
              Q: {timeLeft}s
            </span>
          </div>

          <div className="text-xs font-semibold px-2 py-1 rounded bg-[var(--color-brand-light)] text-[var(--color-brand)]">
            Q#{questionIndex + 1}
          </div>
        </div>
      </CardContent>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-muted)]/30">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "ai" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm whitespace-pre-wrap ${
                msg.sender === "ai"
                  ? "bg-white text-[var(--color-foreground)] border border-[var(--color-border)]"
                  : "bg-[var(--color-brand)] text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isAiTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-xs text-[var(--color-muted-foreground)] flex items-center gap-1.5 shadow-sm">
              <Loader2 size={12} className="animate-spin text-[var(--color-brand)]" />
              TAO AI is analyzing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Speak Control Form */}
      <CardContent className="p-4 border-t border-[var(--color-border)] flex-shrink-0 bg-white">
        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Pulsing visual soundwave when listening */}
            <div className="flex-1 relative">
              <Textarea
                value={currentInput}
                readOnly
                placeholder={
                  isAiTyping
                    ? "Please wait for AI response..."
                    : isListening
                    ? "Listening... Speak your answer now."
                    : "Tap the microphone to start speaking your answer..."
                }
                rows={2}
                className="resize-none focus-visible:ring-[var(--color-brand)] bg-slate-50/50 text-slate-800 text-sm font-medium border-slate-200"
              />
              {isListening && (
                <div className="absolute right-3 bottom-3 wave-container">
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                </div>
              )}
            </div>

            {/* Toggle Mic Button */}
            {/* onTouchEnd fires on iOS Safari before onClick. We set a flag in
                onTouchEnd so the subsequent ghost onClick is a no-op, preventing
                toggleListening from firing twice on mobile. */}
            <Button
              type="button"
              onTouchEnd={(e) => {
                e.preventDefault();
                touchHandledRef.current = true;
                toggleListening();
              }}
              onClick={() => {
                if (touchHandledRef.current) {
                  touchHandledRef.current = false;
                  return; // Skip — already handled by onTouchEnd on mobile
                }
                toggleListening();
              }}
              disabled={isAiTyping}
              variant={isListening ? "destructive" : "outline"}
              className={`h-12 w-12 rounded-full p-0 flex items-center justify-center shrink-0 shadow-sm transition-all touch-manipulation ${
                isListening ? "mic-active-pulse" : "hover:bg-[var(--color-brand-light)] hover:text-[var(--color-brand)]"
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} />}
            </Button>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isAiTyping || !currentInput.trim()}
              className="px-4 h-12 shadow-sm shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>

          {error && (
            <div className="text-xs text-[var(--color-destructive)] bg-red-50 p-2.5 rounded flex items-start gap-2 border border-red-200">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
