"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  isActive: boolean
  isListening: boolean
}

export function AudioVisualizer({ isActive, isListening }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bars = 40
    const barWidth = canvas.width / bars
    const centerY = canvas.height / 2

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isListening) {
        for (let i = 0; i < bars; i++) {
          const height = Math.random() * (canvas.height * 0.6) + canvas.height * 0.1

          const x = i * barWidth
          const y = centerY - height / 2

          ctx.fillStyle = "hsl(var(--muted-foreground))"
          ctx.fillRect(x + barWidth * 0.2, y, barWidth * 0.6, height)
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isListening])

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="relative h-64 w-64">
          {/* Main blob circle */}
          <div
            className={`absolute inset-0 rounded-full bg-yellow-400 transition-all duration-300 ${
              isActive ? "animate-blob-morph shadow-[0_0_60px_rgba(250,204,21,0.6)]" : ""
            }`}
            style={{
              willChange: isActive ? "border-radius, transform" : "auto",
            }}
          />

          {/* Secondary blob layer for more organic movement */}
          <div
            className={`absolute inset-2 rounded-full bg-yellow-400/80 transition-all duration-300 ${
              isActive ? "animate-blob-morph-alt" : ""
            }`}
            style={{
              willChange: isActive ? "border-radius, transform" : "auto",
            }}
          />

          {/* Inner glow layer */}
          <div
            className={`absolute inset-8 rounded-full bg-yellow-300/60 transition-all duration-300 ${
              isActive ? "animate-blob-pulse" : ""
            }`}
            style={{
              willChange: isActive ? "transform, opacity" : "auto",
            }}
          />
        </div>
      </div>

      {isListening && <canvas ref={canvasRef} width={400} height={80} className="rounded-lg" />}
    </div>
  )
}
