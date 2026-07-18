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
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number>(900); // 15 minutes in seconds
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Keep refs of state to use in callbacks without re-binding
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
        response: "(No responses recorded within the 15-minute time limit)"
      });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
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

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
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
  // Initialize Audio Recording Support check
  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      navigator.mediaDevices &&
      typeof MediaRecorder !== "undefined";
    setSpeechSupported(isSupported);
    if (!isSupported) {
      setError("Audio recording is not supported in this browser. Please use Chrome, Safari, or Edge.");
    }

    return () => {
      // Clean up active streams on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
    if (mode === "chat" && !isAiTyping) {
      startListening();
    } else {
      stopListening();
    }
  }, [isAiTyping, mode]);

  async function startListening() {
    if (isTranscribing || isAiTyping || isSubmittingRef.current) return;
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options = { mimeType: "audio/ogg" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;

        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          const formData = new FormData();
          formData.append("audio", audioBlob, "interview-response.webm");

          const res = await fetch("/api/interviews/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to transcribe audio");
          }

          const data = await res.json();
          const transcriptText = data.transcript || "";
          
          if (transcriptText) {
            setCurrentInput(transcriptText);
          }
        } catch (e: any) {
          console.error("Transcription error:", e);
          setError("TAO AI was unable to transcribe your voice. Please try speaking again.");
        } finally {
          setIsTranscribing(false);
          // Release microphone tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      };

      recorder.start();
      setIsListening(true);
    } catch (e: any) {
      console.error("Error starting recording:", e);
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser settings to speak your answers.");
      } else {
        setError("Could not access your microphone. Please check your recording device settings.");
      }
      setIsListening(false);
    }
  }

  function stopListening() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  async function handleAutoSubmit() {
    if (isListening) {
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            setIsTranscribing(true);
            try {
              const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current!.mimeType });
              const formData = new FormData();
              formData.append("audio", audioBlob, "interview-response.webm");

              const res = await fetch("/api/interviews/transcribe", {
                method: "POST",
                body: formData,
              });

              if (!res.ok) throw new Error("Transcription failed");
              const data = await res.json();
              const transcript = data.transcript || "(No verbal response captured)";
              await sendAnswer(transcript);
            } catch (e) {
              console.error("Transcription error on auto-submit:", e);
              await sendAnswer("(No verbal response captured)");
            } finally {
              setIsTranscribing(false);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
              }
            }
          } else {
            await sendAnswer("(No verbal response captured)");
          }
        };
        mediaRecorderRef.current.stop();
      }
    } else {
      const finalSpeech = currentInput.trim() || "(No verbal response captured)";
      await sendAnswer(finalSpeech);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (isAiTyping || isPending || isTranscribing) return;

    if (isListening) {
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            setIsTranscribing(true);
            try {
              const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current!.mimeType });
              const formData = new FormData();
              formData.append("audio", audioBlob, "interview-response.webm");

              const res = await fetch("/api/interviews/transcribe", {
                method: "POST",
                body: formData,
              });

              if (!res.ok) throw new Error("Transcription failed");
              const data = await res.json();
              const transcript = data.transcript || "(No verbal response captured)";
              await sendAnswer(transcript);
            } catch (e) {
              console.error("Transcription error on send:", e);
              await sendAnswer("(No verbal response captured)");
            } finally {
              setIsTranscribing(false);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
              }
            }
          } else {
            await sendAnswer("(No verbal response captured)");
          }
        };
        mediaRecorderRef.current.stop();
      }
    } else {
      const finalSpeech = currentInput.trim() || "(No verbal response captured)";
      await sendAnswer(finalSpeech);
    }
  }

  async function sendAnswer(text: string) {
    // Append candidate message
    setMessages((prev) => [...prev, { sender: "candidate", text }]);
    setCurrentInput("");
    stopListening();

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
    setGlobalTimeLeft(900); // Reset global timer
    fetchNextQuestion(0, [], 900);
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
                <strong className="block">15-Minute Total Time Limit</strong>
                <span className="text-[var(--color-muted-foreground)]">The entire interview is limited to exactly 15 minutes total. The countdown will begin as soon as you start.</span>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <Info size={16} className="text-[var(--color-brand)] mt-0.5" />
              <div>
                <strong className="block">Auto-Submission & Finalization</strong>
                <span className="text-[var(--color-muted-foreground)]">When the 15-minute limit expires, all your answers gathered so far will be automatically finalized and submitted to the recruiter.</span>
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
  const globalProgressPercent = (globalTimeLeft / 900) * 100;
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
                value={
                  isTranscribing
                    ? "Transcribing your voice... Please wait."
                    : currentInput
                }
                readOnly
                placeholder={
                  isAiTyping
                    ? "Please wait for AI response..."
                    : isTranscribing
                    ? "Processing audio transcript..."
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
            <Button
              type="button"
              onClick={toggleListening}
              disabled={isAiTyping || isTranscribing}
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
