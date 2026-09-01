import { useEffect, useRef } from 'react'
import { advect, interpolateWind, projectWindPoint, WIND_BOUNDS, type WindField } from '../data/wind'

interface WindCanvasProps { field: WindField }

interface Particle { longitude: number; latitude: number; age: number; maxAge: number }

const FRAME_INTERVAL = 1000 / 30
const SIMULATED_SECONDS_PER_SECOND = 18_000

function randomParticle(): Particle {
  return {
    longitude: WIND_BOUNDS.west + Math.random() * (WIND_BOUNDS.east - WIND_BOUNDS.west),
    latitude: WIND_BOUNDS.south + Math.random() * (WIND_BOUNDS.north - WIND_BOUNDS.south),
    age: Math.random() * 100,
    maxAge: 70 + Math.random() * 70,
  }
}

function resetParticle(particle: Particle) {
  Object.assign(particle, randomParticle(), { age: 0 })
}

export function WindCanvas({ field }: WindCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frameId = 0
    let lastFrame = 0
    let particles: Particle[] = []
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function resize() {
      const bounds = parent!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.max(1, Math.round(bounds.width * dpr))
      canvas!.height = Math.max(1, Math.round(bounds.height * dpr))
      canvas!.style.width = `${bounds.width}px`
      canvas!.style.height = `${bounds.height}px`
      context!.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: bounds.width <= 800 ? 250 : 500 }, randomParticle)
      context!.clearRect(0, 0, bounds.width, bounds.height)
      if (reducedMotion) drawStatic(bounds.width, bounds.height)
    }

    function drawStatic(width: number, height: number) {
      context!.strokeStyle = 'rgba(20, 80, 105, .48)'
      context!.lineWidth = 1
      for (let latitude = -16; latitude <= 16; latitude += 8) {
        for (let longitude = 128; longitude <= 272; longitude += 16) {
          const vector = interpolateWind(field, longitude, latitude)
          if (!vector) continue
          const start = projectWindPoint(longitude, latitude, width, height)
          const magnitude = Math.hypot(vector.u, vector.v)
          if (magnitude < 0.1) continue
          const scale = Math.min(13, 4 + magnitude * .6) / magnitude
          context!.beginPath()
          context!.moveTo(start.x, start.y)
          context!.lineTo(start.x + vector.u * scale, start.y - vector.v * scale)
          context!.stroke()
        }
      }
    }

    function draw(time: number) {
      frameId = requestAnimationFrame(draw)
      if (document.hidden || time - lastFrame < FRAME_INTERVAL) return
      const dt = Math.min((time - (lastFrame || time - FRAME_INTERVAL)) / 1000, .05)
      lastFrame = time
      const width = parent!.clientWidth
      const height = parent!.clientHeight
      context!.globalCompositeOperation = 'destination-out'
      context!.fillStyle = 'rgba(0,0,0,.075)'
      context!.fillRect(0, 0, width, height)
      context!.globalCompositeOperation = 'source-over'
      context!.strokeStyle = 'rgba(21, 102, 135, .72)'
      context!.lineWidth = 1
      context!.beginPath()
      for (const particle of particles) {
        const vector = interpolateWind(field, particle.longitude, particle.latitude)
        if (!vector || particle.age++ > particle.maxAge) {
          resetParticle(particle)
          continue
        }
        const start = projectWindPoint(particle.longitude, particle.latitude, width, height)
        const next = advect(particle.longitude, particle.latitude, vector, dt * SIMULATED_SECONDS_PER_SECOND)
        if (next.longitude < WIND_BOUNDS.west || next.longitude > WIND_BOUNDS.east || next.latitude < WIND_BOUNDS.south || next.latitude > WIND_BOUNDS.north) {
          resetParticle(particle)
          continue
        }
        const end = projectWindPoint(next.longitude, next.latitude, width, height)
        context!.moveTo(start.x, start.y)
        context!.lineTo(end.x, end.y)
        particle.longitude = next.longitude
        particle.latitude = next.latitude
      }
      context!.stroke()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    resize()
    if (!reducedMotion) frameId = requestAnimationFrame(draw)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameId)
    }
  }, [field])

  return <canvas ref={canvasRef} className="wind-canvas" aria-hidden="true" />
}
