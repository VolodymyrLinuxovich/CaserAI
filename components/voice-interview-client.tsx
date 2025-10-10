"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, X, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { DataExhibitSlideover } from "@/components/data-exhibit-slideover";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
  timestamp: Date;
}

interface VoiceInterviewClientProps {
  caseData: {
    id: string;
    title: string;
    description: string;
    prompt: string;
    industry: string;
    difficulty: string;
  };
  interviewId: string;
  userId: string;
}

export function VoiceInterviewClient({ caseData, interviewId, userId }: VoiceInterviewClientProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentAIText, setCurrentAIText] = useState("");
  const [displayedAIText, setDisplayedAIText] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const ELEVEN_DEFAULT_VOICE = useRef<string>("pNInz6obpgDQGcFmaJgB"); // Adam

  const router = useRouter();
  const supabase = createClient();
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    if (typeof window === "undefined") return;

    synthRef.current = window.speechSynthesis;

    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";

      r.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        if (final) {
          const userMessage: ChatMessage = { role: "user", content: final, timestamp: new Date() };
          setMessages((prev) => [...prev, userMessage]);
          setInterimTranscript("");
          handleAIResponse(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      r.onerror = (e: any) => {
        console.error("[CaserAI] Speech recognition error:", e?.error);
        setIsListening(false);
      };

      r.onend = () => {
        if (isListening) r.start();
      };

      recognitionRef.current = r;
    }

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (!currentAIText) {
      setDisplayedAIText("");
      return;
    }
    let i = 0;
    setDisplayedAIText("");
    const id = setInterval(() => {
      if (i < currentAIText.length) {
        setDisplayedAIText(currentAIText.slice(0, i + 1));
        i++;
      } else clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [currentAIText]);

  const handleAIResponse = async (userInput: string) => {
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userInput }],
          caseContext: caseData,
          interviewId,
        }),
      });
      const data = await res.json();
      const aiMessage: ChatMessage = { role: "assistant", content: data.message, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMessage]);
      setCurrentAIText(data.message);
      await speakText(data.message);
    } catch (e) {
      console.error("[CaserAI] AI response error:", e);
    }
  };

  const speakText = async (text: string) => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsSpeaking(true);

    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: ELEVEN_DEFAULT_VOICE.current,
          model_id: "eleven_turbo_v2",
        }),
      });

      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.includes("audio")) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setCurrentAIText("");
        };
        await audioRef.current.play();
        return;
      }

      console.warn("[CaserAI] TTS not audio:", await r.text());
      playLocal(text);
    } catch (e) {
      console.error("[CaserAI] TTS fetch failed:", e);
      playLocal(text);
    }
  };

  const playLocal = (text: string) => {
    if (!synthRef.current) {
      setIsSpeaking(false);
      return;
    }
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => {
      setIsSpeaking(false);
      setCurrentAIText("");
    };
    synthRef.current.speak(u);
  };

  const startInterview = () => {
    setHasStarted(true);
    const welcome: ChatMessage = { role: "assistant", content: caseData.prompt, timestamp: new Date() };
    setMessages([welcome]);
    setCurrentAIText(caseData.prompt);
    speakText(caseData.prompt);
    startTimeRef.current = new Date();
  };

  const toggleListening = () => {
    if (!hasStarted) {
      startInterview();
      return;
    }
    if (isSpeaking) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start?.();
      setIsListening(true);
    }
  };

  const endInterview = async () => {
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);

    if (!interviewId.startsWith("demo-")) {
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration,
          transcript: messages,
        })
        .eq("id", interviewId);

      await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });
    }

    router.push(`/interview/${interviewId}/feedback`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold">{caseData.title}</h1>
            <p className="text-sm text-muted-foreground">
              {caseData.industry} • {caseData.difficulty}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={endInterview}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <DataExhibitSlideover exhibits={sampleExhibits} />

      <main className="container mx-auto flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-8">
          {!hasStarted ? (
            <div className="text-center">
              <h2 className="mb-2 text-3xl font-bold">Ready to begin?</h2>
              <p className="mb-8 text-lg text-muted-foreground">Click the microphone to start your case interview</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
                </p>
              </div>

              <AudioVisualizer isActive={isSpeaking} isListening={isListening} />

              <div className="min-h-[120px] w-full max-w-lg text-center">
                {isSpeaking && displayedAIText && (
                  <p className="text-balance text-lg leading-relaxed text-foreground">
                    {displayedAIText}
                    <span className="animate-pulse">|</span>
                  </p>
                )}
                {isListening && interimTranscript && (
                  <p className="text-balance text-lg leading-relaxed italic text-muted-foreground">
                    {interimTranscript}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-6">
            {hasStarted && (
              <Button
                size="lg"
                variant="ghost"
                className="h-16 w-16 rounded-full bg-muted hover:bg-muted/80"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = audioRef.current.duration;
                  }
                  synthRef.current?.cancel();
                  setIsSpeaking(false);
                  setCurrentAIText("");
                }}
                disabled={!isSpeaking}
              >
                <Volume2 className="h-6 w-6" />
              </Button>
            )}

            <Button
              size="lg"
              variant={isListening ? "default" : "outline"}
              className={`h-20 w-20 rounded-full transition-all ${
                isListening ? "bg-yellow-400 hover:bg-yellow-500" : "bg-yellow-400/80 hover:bg-yellow-400"
              }`}
              onClick={toggleListening}
              disabled={isSpeaking}
            >
              {isListening ? (
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-background border-t-transparent" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            {hasStarted && (
              <Button
                size="lg"
                variant="ghost"
                className="h-16 w-16 rounded-full bg-muted hover:bg-muted/80"
                onClick={endInterview}
              >
                <X className="h-6 w-6" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

const sampleExhibits = [
  { id: "1", title: "Market Size Analysis", type: "chart" as const, data: {} },
  { id: "2", title: "Revenue Breakdown", type: "table" as const, data: {} },
];