import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export const C = {
  bg: '#06080B',
  panel: '#0B0F14',
  line: 'rgba(255,255,255,0.09)',
  text: '#F4F6F8',
  dim: '#8A94A3',
  blue: '#2B6BEA',
  amber: '#EDA43A',
  pt: '#7DD3FC',
  yt: '#34D399',
}

export const SANS = '"Inter","SF Pro Text",-apple-system,system-ui,sans-serif'
export const SERIF = '"Instrument Serif","Iowan Old Style",Georgia,serif'

/** Eased 0 -> 1 over `len` frames, held after. */
export const ease = (frame: number, start: number, len: number) =>
  interpolate(frame, [start, start + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

/** A soft vignette and a slow drift, so a still screenshot never feels frozen. */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame()
  const drift = Math.sin(frame / 190) * 26
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 620px at ${50 + drift / 8}% 18%, rgba(43,107,234,0.16), transparent 62%),
                       radial-gradient(900px 560px at ${18 - drift / 10}% 86%, rgba(52,211,153,0.10), transparent 60%)`,
        }}
      />
    </AbsoluteFill>
  )
}

/** The Stripr ribbon, drawn rather than imported so it stays sharp at any size. */
export const Mark: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
    <path d="M78 12 H40 C24 12 16 20 16 30 C16 39 23 44 34 46 L78 12Z" fill={C.blue} />
    <path d="M22 50 L78 50 C86 50 88 44 84 41 L34 41 C26 41 20 45 22 50Z" fill="#23282D" />
    <path d="M22 88 H60 C76 88 84 80 84 70 C84 61 77 56 66 54 L22 88Z" fill={C.amber} />
  </svg>
)

/** The screen recording, framed like a window and drifting very slightly. */
export const Screen: React.FC<{
  children: React.ReactNode
  zoom?: number
  pan?: [number, number]
  enter?: number
}> = ({ children, zoom = 1, pan = [0, 0], enter = 0 }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const t = frame / Math.max(1, durationInFrames)
  const inFade = ease(frame, enter, 14)
  const scale = (1.006 + 0.016 * t) * zoom
  const x = pan[0] * t
  const y = pan[1] * t
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 1640,
          height: 923,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${C.line}`,
          boxShadow: '0 50px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)',
          transform: `translate(${x}px, ${y - 22}px) scale(${scale}) translateY(${(1 - inFade) * 18}px)`,
          opacity: inFade,
          background: C.panel,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  )
}

/** One line of context, bottom-left, timed to the narration it belongs to. */
export const Caption: React.FC<{ kicker?: string; text: string; accent?: string }> = ({ kicker, text, accent = C.yt }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const inA = ease(frame, 6, 16)
  const outA = interpolate(frame, [durationInFrames - 16, durationInFrames - 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const a = Math.min(inA, outA)
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 46px 74px' }}>
      <div style={{ opacity: a, transform: `translateY(${(1 - inA) * 14}px)` }}>
        {kicker ? (
          <div
            style={{
              fontFamily: SANS, fontSize: 17, letterSpacing: 2.6, textTransform: 'uppercase',
              color: accent, fontWeight: 600, marginBottom: 10,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: SANS, fontSize: 34, lineHeight: 1.3, color: C.text, fontWeight: 500,
            maxWidth: 1180, textShadow: '0 4px 28px rgba(0,0,0,0.8)',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Opening card. */
export const Title: React.FC = () => {
  const frame = useCurrentFrame()
  const a = ease(frame, 4, 22)
  const b = ease(frame, 20, 22)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: a, transform: `translateY(${(1 - a) * 16}px)` }}>
        <Mark size={78} />
        <div style={{ fontFamily: SERIF, fontSize: 104, color: C.text, letterSpacing: -1 }}>Stripr</div>
      </div>
      <div
        style={{
          marginTop: 26, fontFamily: SANS, fontSize: 30, color: C.dim, opacity: b,
          transform: `translateY(${(1 - b) * 12}px)`, letterSpacing: 0.2,
        }}
      >
        Yield stripping for tokenized stocks on Solana
      </div>
    </AbsoluteFill>
  )
}

/** Closing card. */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame()
  const a = ease(frame, 4, 20)
  const b = ease(frame, 22, 20)
  const c = ease(frame, 40, 20)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: a }}>
        <Mark size={64} />
        <div style={{ fontFamily: SERIF, fontSize: 86, color: C.text }}>Stripr</div>
      </div>
      <div style={{ marginTop: 22, fontFamily: SANS, fontSize: 30, color: C.text, opacity: b, textAlign: 'center', lineHeight: 1.45 }}>
        The dividends of a tokenized stock,
        <br />
        as an asset you can own, price and sell.
      </div>
      <div
        style={{
          marginTop: 34, fontFamily: SANS, fontSize: 27, color: C.yt, opacity: c,
          border: `1px solid ${C.line}`, borderRadius: 999, padding: '13px 30px', letterSpacing: 0.4,
        }}
      >
        stripr.xyz
      </div>
      <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 19, color: C.dim, opacity: c }}>
        Live on Solana mainnet · Built for the Stocklana Hackathon
      </div>
    </AbsoluteFill>
  )
}

/**
 * Holds a panel-coloured cover over the first frames of a clip. OffthreadVideo shows a
 * light grey placeholder until its first frame is decoded, and premounting does not
 * always beat it, so the cover stays solid through the decode window and then fades.
 * The short hold reads as a beat between sections rather than a defect.
 */
export const Cover: React.FC = () => {
  const frame = useCurrentFrame()
  const a = interpolate(frame, [0, 8, 17], [1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (a <= 0) return null
  return <AbsoluteFill style={{ background: C.panel, opacity: a }} />
}
