"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, X, Volume2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { AudioVisualizer } from "@/components/audio-visualizer"
import { DataExhibitSlideover } from "@/components/data-exhibit-slideover"
import { createClient } from "@/lib/supabase/client"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface VoiceInterviewClientProps {
  caseData: {
    id: string
    title: string
    description: string
    prompt: string
    industry: string
    difficulty: string
  }
  interviewId: string
  userId: string
}

export function VoiceInterviewClient({ caseData, interviewId, userId }: VoiceInterviewClientProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [interimTranscript, setInterimTranscript] = useState("")
  const [hasStarted, setHasStarted] = useState(false)
  const [currentAIText, setCurrentAIText] = useState("")
  const [displayedAIText, setDisplayedAIText] = useState("")
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const startTimeRef = useRef<Date>(new Date())

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event: any) => {
          let interim = ""
          let final = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              final += transcript
            } else {
              interim += transcript
            }
          }

          if (final) {
            const userMessage: Message = {
              role: "user",
              content: final,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, userMessage])
            setInterimTranscript("")
            handleAIResponse(final)
          } else {
            setInterimTranscript(interim)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("[v0] Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          if (isListening) {
            recognitionRef.current?.start()
          }
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [isListening])

  useEffect(() => {
    if (!currentAIText) {
      setDisplayedAIText("")
      return
    }

    let index = 0
    setDisplayedAIText("")

    const interval = setInterval(() => {
      if (index < currentAIText.length) {
        setDisplayedAIText(currentAIText.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
      }
    }, 30) // Adjust speed of typewriter effect

    return () => clearInterval(interval)
  }, [currentAIText])

  const handleAIResponse = async (userInput: string) => {
    try {
      const response = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userInput }],
          caseContext: caseData,
          interviewId,
        }),
      })

      const data = await response.json()
      const aiMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setCurrentAIText(data.message)
      speakText(data.message)
    } catch (error) {
      console.error("[v0] Error getting AI response:", error)
    }
  }

  const speakText = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        setCurrentAIText("")
      }

      synthRef.current.speak(utterance)
    }
  }

  const startInterview = () => {
    setHasStarted(true)
    const welcomeMessage: Message = {
      role: "assistant",
      content: caseData.prompt,
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
    setCurrentAIText(caseData.prompt)
    speakText(caseData.prompt)
    startTimeRef.current = new Date()
  }

  const toggleListening = () => {
    if (!hasStarted) {
      startInterview()
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const endInterview = async () => {
    recognitionRef.current?.stop()
    synthRef.current?.cancel()

    const duration = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)

    if (!interviewId.startsWith("demo-")) {
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration,
          transcript: messages,
        })
        .eq("id", interviewId)

      await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      })
    }

    router.push(`/interview/${interviewId}/feedback`)
  }

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
                  {isListening ? "Listening..." : isSpeaking ? "Connecting..." : "Ready"}
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
                onClick={() => synthRef.current?.cancel()}
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
    </div>
  )
}

const sampleExhibits = [
  {
    id: "1",
    title: "Market Size Analysis",
    type: "chart" as const,
    data: {},
  },
  {
    id: "2",
    title: "Revenue Breakdown",
    type: "table" as const,
    data: {},
  },
]
