import React from 'react'
import { AbsoluteFill, Freeze, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces'
import { loadFont as loadFigtree } from '@remotion/google-fonts/Figtree'
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono'
import clipManifest from './clips.json'

/**
 * Shared furniture for the Stripr film.
 *
 * Stripr's product is a dark, precise instrument, so the film is set the same way:
 * ink stock with a fine dot screen, the app's own editorial pairing (Fraunces over
 * Figtree, Geist Mono for figures and labels), hairline rules, and the brand's amber
 * used for the one phrase in each headline that carries the point. PT is sky and YT
 * is emerald everywhere, exactly as in the app. Motion is unhurried: type is uncovered
 * from its own baseline, rules draw themselves, cards rise a short way and settle.
 */

/* ------------------------------------------------------------------ palette */

export const INK = '#06080B'
export const INK_2 = '#0A0E13'
export const PANEL = '#0E1319'
export const CARD = '#11171F'
export const LINE = 'rgba(255,255,255,0.09)'
export const LINE_2 = 'rgba(255,255,255,0.16)'
export const TEXT = '#F2F4F7'
export const SOFT = '#AEB6C2'
export const FAINT = '#6E7885'
export const AMBER = '#EDA43A'
export const AMBER_TINT = 'rgba(237,164,58,0.14)'
export const BLUE = '#3B7BF0'
export const BLUE_TINT = 'rgba(59,123,240,0.15)'
export const PT = '#7DD3FC'
export const PT_TINT = 'rgba(125,211,252,0.13)'
export const YT = '#34D399'
export const YT_TINT = 'rgba(52,211,153,0.13)'
export const RED = '#F87171'
export const RED_TINT = 'rgba(248,113,113,0.13)'

/* -------------------------------------------------------------------- fonts */

const fraunces = loadFraunces('normal', { weights: ['400', '500', '600'], subsets: ['latin'] })
loadFraunces('italic', { weights: ['400', '500'], subsets: ['latin'] })
const figtree = loadFigtree('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })
const geist = loadGeistMono('normal', { weights: ['400', '500', '600'], subsets: ['latin'] })

export const SERIF = `${fraunces.fontFamily}, Georgia, serif`
export const SANS = `${figtree.fontFamily}, system-ui, sans-serif`
export const MONO = `${geist.fontFamily}, ui-monospace, monospace`

/* ------------------------------------------------------------------- motion */

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

/** 0 to 1 over `dur` frames from `delay`, eased out. */
export const useProgress = (delay = 0, dur = 22) => {
  const f = useCurrentFrame()
  return easeOut(interpolate(f, [delay, delay + dur], [0, 1], CLAMP))
}

/** Rise-and-settle. With `out`, the same move in reverse from that frame. */
export const useRise = (delay = 0, distance = 22, out?: number) => {
  const f = useCurrentFrame()
  const pin = easeOut(interpolate(f, [delay, delay + 22], [0, 1], CLAMP))
  const pout = out === undefined ? 0 : easeInOut(interpolate(f, [out, out + 14], [0, 1], CLAMP))
  return { opacity: pin * (1 - pout), transform: `translateY(${(1 - pin) * distance - pout * 12}px)` }
}

export const Rise: React.FC<{ children: React.ReactNode; delay?: number; distance?: number; out?: number; style?: React.CSSProperties }> = ({
  children, delay = 0, distance = 22, out, style,
}) => <div style={{ ...useRise(delay, distance, out), ...style }}>{children}</div>

/** A rule that draws itself from one end. */
export const Hairline: React.FC<{ delay?: number; width?: number | string; color?: string; weight?: number; out?: number; origin?: 'left' | 'right' }> = ({
  delay = 0, width = '100%', color = LINE_2, weight = 1.5, out, origin = 'left',
}) => {
  const f = useCurrentFrame()
  const p = easeInOut(interpolate(f, [delay, delay + 26], [0, 1], CLAMP))
  const o = out === undefined ? 1 : 1 - interpolate(f, [out, out + 14], [0, 1], CLAMP)
  return <div style={{ width, height: weight, background: color, opacity: o, transform: `scaleX(${p})`, transformOrigin: `${origin} center` }} />
}

/** Uncovers its children from behind their own baseline. */
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; dur?: number; from?: 'below' | 'above'; out?: number; style?: React.CSSProperties }> = ({
  children, delay = 0, dur = 24, from = 'below', out, style,
}) => {
  const f = useCurrentFrame()
  const pin = easeOut(interpolate(f, [delay, delay + dur], [0, 1], CLAMP))
  const pout = out === undefined ? 0 : easeInOut(interpolate(f, [out, out + 16], [0, 1], CLAMP))
  const sign = from === 'below' ? 1 : -1
  return (
    <div style={{ overflow: 'hidden', paddingBottom: 6, marginBottom: -6, ...style }}>
      <div style={{ transform: `translateY(${((1 - pin) * 104 + pout * 104) * sign}%)`, opacity: Math.min(1, pin * 3) }}>{children}</div>
    </div>
  )
}

/** Counts a number up (or across) between two values, formatted by `fmt`. */
export const Count: React.FC<{ from: number; to: number; start: number; dur?: number; fmt: (n: number) => string; style?: React.CSSProperties }> = ({
  from, to, start, dur = 40, fmt, style,
}) => {
  const f = useCurrentFrame()
  const p = easeInOut(interpolate(f, [start, start + dur], [0, 1], CLAMP))
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{fmt(from + (to - from) * p)}</span>
}

/* ----------------------------------------------------------------- backdrop */

/** Ink stock with a dot screen, two slow glows in the brand's blue and emerald, and a vignette. */
export const Backdrop: React.FC<{ tone?: 'ink' | 'cover'; glow?: 'left' | 'right' }> = ({ tone = 'ink', glow = 'right' }) => {
  const f = useCurrentFrame()
  const d = Math.sin(f / 150) * 3
  const cover = tone === 'cover'
  const gx = glow === 'right' ? 74 : 26
  return (
    <AbsoluteFill style={{ background: cover ? '#05070A' : INK }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 640px at ${gx + d}% ${cover ? 42 : 24}%, rgba(59,123,240,${cover ? 0.2 : 0.13}), transparent 64%),
                       radial-gradient(760px 520px at ${100 - gx - d}% 92%, rgba(52,211,153,${cover ? 0.1 : 0.07}), transparent 62%)`,
        }}
      />
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1.2px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  )
}

/* --------------------------------------------------------------------- type */

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number; color?: string; size?: number; out?: number }> = ({
  children, delay = 0, color = YT, size = 21, out,
}) => (
  <div style={{ ...useRise(delay, 12, out), fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap', color }}>
    {children}
  </div>
)

export type HeadLine = string | { em: string }
/** Serif headline; a line given as { em } is set in amber italic. Each line rises out of its own baseline. */
export const Headline: React.FC<{ lines: HeadLine[]; delay?: number; size?: number; stagger?: number; out?: number; align?: 'left' | 'center'; emColor?: string }> = ({
  lines, delay = 0, size = 72, stagger = 6, out, align = 'left', emColor = AMBER,
}) => (
  <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.06, letterSpacing: '-0.024em', fontWeight: 500, color: TEXT, textAlign: align }}>
    {lines.map((l, i) => (
      <Reveal key={i} delay={delay + i * stagger} out={out} style={{ paddingBottom: size * 0.18, marginBottom: -size * 0.18 }}>
        {typeof l === 'string' ? <span>{l}</span> : <span style={{ fontStyle: 'italic', fontWeight: 400, color: emColor }}>{l.em}</span>}
      </Reveal>
    ))}
  </div>
)

export const Body: React.FC<{ children: React.ReactNode; delay?: number; size?: number; color?: string; width?: number; out?: number }> = ({
  children, delay = 0, size = 27, color = SOFT, width = 520, out,
}) => <div style={{ ...useRise(delay, 16, out), fontFamily: SANS, fontSize: size, lineHeight: 1.45, color, maxWidth: width }}>{children}</div>

/** Large serif chapter numeral, in amber. */
export const StepNumber: React.FC<{ n: number; delay?: number; size?: number; out?: number }> = ({ n, delay = 0, size = 112, out }) => (
  <Reveal delay={delay} out={out}>
    <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 0.95, fontWeight: 400, letterSpacing: '-0.03em', color: AMBER, fontFeatureSettings: '"lnum" 1' }}>
      {String(n).padStart(2, '0')}
    </div>
  </Reveal>
)

/* -------------------------------------------------------------------- brand */

export const MARK_W = 353
export const MARK_H = 491
export const WORD_W = 1024
export const WORD_H = 411

/** The ribbon mark is uncovered from its base, then the word slides out from behind it. */
export const Lockup: React.FC<{ height?: number; delay?: number }> = ({ height = 150, delay = 0 }) => {
  const f = useCurrentFrame()
  const mark = easeInOut(interpolate(f, [delay, delay + 26], [0, 1], CLAMP))
  const word = easeOut(interpolate(f, [delay + 14, delay + 44], [0, 1], CLAMP))
  const mw = (height * MARK_W) / MARK_H
  const wh = height * 0.74
  const ww = (wh * WORD_W) / WORD_H
  const gap = height * 0.2
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ clipPath: `inset(${(1 - mark) * 100}% 0 0 0)`, transform: `translateY(${(1 - mark) * 12}px)` }}>
        <Img src={staticFile('brand/mark.png')} style={{ width: mw, height, display: 'block' }} />
      </div>
      <div style={{ width: (ww + gap) * word, overflow: 'hidden', height, display: 'flex', alignItems: 'center' }}>
        <div style={{ paddingLeft: gap, opacity: Math.min(1, word * 1.6), transform: `translateX(${(1 - word) * -30}px)` }}>
          <Img src={staticFile('brand/word.png')} style={{ width: ww, height: wh, display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

export const TokenLogo: React.FC<{ sym: string; size?: number; style?: React.CSSProperties }> = ({ sym, size = 44, style }) => (
  <Img src={staticFile(`tokens/${sym}.png`)} style={{ width: size, height: size, borderRadius: 999, display: 'block', ...style }} />
)

/* -------------------------------------------------------------- small parts */

export const cardStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${CARD}, ${PANEL})`,
  border: `1.5px solid ${LINE}`,
  borderRadius: 20,
  boxShadow: '0 1px 0 rgba(255,255,255,.05) inset, 0 40px 80px -40px rgba(0,0,0,.8), 0 4px 14px -6px rgba(0,0,0,.5)',
}

export const Card: React.FC<{ children: React.ReactNode; delay?: number; pad?: number; width?: number | string; out?: number; style?: React.CSSProperties; distance?: number }> = ({
  children, delay = 0, pad = 30, width, out, style, distance = 22,
}) => <div style={{ ...useRise(delay, distance, out), ...cardStyle, width, padding: pad, ...style }}>{children}</div>

const TONES = {
  yt: { bg: YT_TINT, fg: YT },
  pt: { bg: PT_TINT, fg: PT },
  amber: { bg: AMBER_TINT, fg: AMBER },
  blue: { bg: BLUE_TINT, fg: '#8FB4FF' },
  red: { bg: RED_TINT, fg: RED },
  plain: { bg: 'rgba(255,255,255,0.06)', fg: SOFT },
} as const
export type Tone = keyof typeof TONES

export const Chip: React.FC<{ children: React.ReactNode; tone?: Tone; delay?: number; size?: number; dot?: boolean; out?: number; mono?: boolean }> = ({
  children, tone = 'yt', delay = 0, size = 21, dot, out, mono,
}) => {
  const t = TONES[tone]
  return (
    <span
      style={{
        ...useRise(delay, 10, out),
        display: 'inline-flex', alignItems: 'center', gap: size * 0.45, fontFamily: mono ? MONO : SANS, fontSize: size, fontWeight: 600,
        lineHeight: 1, color: t.fg, background: t.bg, border: `1px solid ${t.fg}33`, borderRadius: 999, padding: `${size * 0.44}px ${size * 0.74}px`, whiteSpace: 'nowrap',
      }}
    >
      {dot && <span style={{ width: size * 0.36, height: size * 0.36, borderRadius: 99, background: t.fg, boxShadow: `0 0 10px ${t.fg}` }} />}
      {children}
    </span>
  )
}

/** Lower third: a rule draws, the name rises out from behind it, the role drops from under it. */
export const Credit: React.FC<{ name: string; role: string; kicker: string; from?: number; width?: number }> = ({ name, role, kicker, from = 0, width = 540 }) => {
  const f = useCurrentFrame()
  if (f < from - 1) return null
  return (
    <div style={{ width }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20 }}>
        <Reveal delay={from + 8}>
          <div style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, letterSpacing: '-0.015em', color: TEXT, lineHeight: 1.12, whiteSpace: 'nowrap' }}>{name}</div>
        </Reveal>
        <Reveal delay={from + 14}>
          <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: YT, whiteSpace: 'nowrap' }}>{kicker}</div>
        </Reveal>
      </div>
      <div style={{ height: 10 }} />
      <Hairline delay={from} color={YT} weight={1.5} />
      <div style={{ height: 12 }} />
      <Reveal delay={from + 14} from="above">
        <div style={{ fontFamily: SANS, fontSize: 22, lineHeight: 1.3, color: SOFT, whiteSpace: 'nowrap' }}>{role}</div>
      </Reveal>
    </div>
  )
}

/** A thin line along the bottom edge: where we are in the film. */
export const ProgressRail: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / Math.max(1, total - 1)) * 100}%`, background: `linear-gradient(90deg, ${BLUE}, ${YT})` }} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------ browser frame */

/**
 * The app is filmed as a 1600x900 CSS page at device scale 2, so every clip is a
 * 3200x1800 file. Focus rectangles are always in CSS pixels of that page - the same
 * coordinates capture.mjs records for each marked element.
 */
export const SRC_W = 1600
export const SRC_H = 900

export type Focus = { rect: [number, number, number, number]; from: number; to: number; move?: number; maxZoom?: number }
export type Shot = { clip: string; at?: number; startFrom?: number; playbackRate?: number; freeze?: boolean; path?: string; dissolve?: number }

type Cam = { cx: number; cy: number; z: number }
const FULL: Cam = { cx: SRC_W / 2, cy: SRC_H / 2, z: 1 }

const camFor = (fo: Focus, zCap: number): Cam => {
  const [x, y, w, h] = fo.rect
  const z = Math.max(1, Math.min(fo.maxZoom ?? 2.4, zCap, Math.min(SRC_W / w, SRC_H / h) * 0.9))
  const half = { w: SRC_W / 2 / z, h: SRC_H / 2 / z }
  return { z, cx: Math.min(SRC_W - half.w, Math.max(half.w, x + w / 2)), cy: Math.min(SRC_H - half.h, Math.max(half.h, y + h / 2)) }
}

const cameraAt = (t: number, focus: Focus[], zCap: number): Cam => {
  const sorted = [...focus].sort((a, b) => a.from - b.from)
  const open = sorted[0] && sorted[0].from <= 0 ? camFor(sorted[0], zCap) : FULL
  const keys: { t: number; c: Cam }[] = [{ t: 0, c: open }]
  sorted.forEach((fo, i) => {
    const move = fo.move ?? 1.1
    const last = keys[keys.length - 1]
    keys.push({ t: Math.max(fo.from, last.t), c: last.c })
    keys.push({ t: Math.max(fo.from, last.t) + move, c: camFor(fo, zCap) })
    keys.push({ t: Math.max(fo.to, fo.from + move), c: camFor(fo, zCap) })
    const next = sorted[i + 1]
    if (!next || next.from > fo.to + move) keys.push({ t: fo.to + move, c: FULL })
  })
  for (let i = keys.length - 1; i >= 0; i--) {
    if (t >= keys[i].t) {
      const a = keys[i]
      const b = keys[i + 1]
      if (!b || b.t === a.t) return a.c
      const p = easeInOut(Math.min(1, (t - a.t) / (b.t - a.t)))
      return { cx: a.c.cx + (b.c.cx - a.c.cx) * p, cy: a.c.cy + (b.c.cy - a.c.cy) * p, z: a.c.z + (b.c.z - a.c.z) * p }
    }
  }
  return FULL
}

type ClipInfo = { duration: number; width: number; marks?: { name: string; t: number; rect: [number, number, number, number] }[] }
const manifest = clipManifest as unknown as Record<string, ClipInfo>

/** Where capture.mjs saw a named element on the page, and when. */
export const mark = (clip: string, name: string) => {
  const m = manifest[clip]?.marks?.find((x) => x.name === name)
  if (!m) throw new Error(`no mark ${clip}.${name}`)
  return m
}
export const clipLength = (clip: string) => manifest[clip]?.duration ?? 0

/** Plays one clip and holds its last frame if the scene outlasts it. */
const ShotVideo: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rate = shot.playbackRate ?? 1
  const start = shot.startFrom ?? 0
  const length = manifest[shot.clip]?.duration ?? 0
  const lastFrame = Math.max(0, Math.floor(((length - start) / rate - 0.25) * fps))
  return (
    <Freeze frame={shot.freeze ? 0 : Math.min(f, lastFrame)}>
      <OffthreadVideo src={staticFile(`clips/${shot.clip}.mp4`)} startFrom={Math.round(start * fps)} playbackRate={rate} muted style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
    </Freeze>
  )
}

/**
 * A quiet browser window around the footage. `focus` moves a virtual camera over the
 * 1600x900 page: it eases onto a rectangle, holds, and eases back or on to the next.
 */
export const BrowserFrame: React.FC<{ shots: Shot[]; width?: number; delay?: number; dur?: number; pushIn?: [number, number]; focus?: Focus[]; host?: string }> = ({
  shots, width = 1260, delay = 0, dur = 360, pushIn = [1, 1.03], focus = [], host = 'stripr.xyz',
}) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = easeOut(interpolate(f, [delay, delay + 26], [0, 1], CLAMP))
  const push = interpolate(f, [0, dur], pushIn, CLAMP)
  const BAR = 46
  const vw = width
  const vh = (width * SRC_H) / SRC_W
  const k = vw / SRC_W
  const zCap = 2.1 / (k * pushIn[1])
  const cam = cameraAt(f / fps, focus, zCap)
  const tx = vw / 2 - cam.cx * k * cam.z
  const ty = vh / 2 - cam.cy * k * cam.z
  const cuts = shots.map((sh) => Math.round((sh.at ?? 0) * fps))
  let active = 0
  cuts.forEach((c, i) => { if (f >= c) active = i })

  return (
    <div
      style={{
        width, opacity: enter, transform: `translateY(${(1 - enter) * 34}px) scale(${push})`, borderRadius: 16, overflow: 'hidden', background: PANEL,
        border: `1.5px solid ${LINE_2}`, boxShadow: '0 80px 140px -60px rgba(0,0,0,.9), 0 30px 60px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03)',
      }}
    >
      <div style={{ height: BAR, display: 'flex', alignItems: 'center', padding: '0 18px', background: '#0C1016', borderBottom: `1.5px solid ${LINE}`, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 9 }}>
          {['#F87171', '#FBBF24', '#34D399'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c, opacity: 0.55 }} />)}
        </div>
        <div
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', height: 32, minWidth: 460, padding: '0 20px', borderRadius: 99,
            background: '#11171F', border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: MONO, fontSize: 17, color: SOFT,
          }}
        >
          <svg width="12" height="14" viewBox="0 0 13 15" fill="none"><rect x="1" y="6.4" width="11" height="7.6" rx="2" fill={YT} /><path d="M3.6 6.4V4.3a2.9 2.9 0 015.8 0v2.1" stroke={YT} strokeWidth="1.6" /></svg>
          <span>{host}<span style={{ color: FAINT }}>{shots[active]?.path ?? ''}</span></span>
        </div>
      </div>
      <div style={{ width: vw, height: vh, position: 'relative', overflow: 'hidden', background: INK }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, transform: `translate(${tx}px, ${ty}px) scale(${cam.z})`, transformOrigin: '0 0' }}>
          {shots.map((sh, i) => {
            const from = cuts[i]
            const fade = i === 0 ? 0 : sh.dissolve ?? 8
            const until = i + 1 < shots.length ? cuts[i + 1] + (shots[i + 1].dissolve ?? 8) : Infinity
            if (f < from || f > until) return null
            const o = fade <= 0 ? 1 : interpolate(f, [from, from + fade], [0, 1], CLAMP)
            return (
              <AbsoluteFill key={`${sh.clip}-${i}`} style={{ opacity: o }}>
                <Sequence from={from} layout="none">
                  <ShotVideo shot={sh} />
                </Sequence>
              </AbsoluteFill>
            )
          })}
        </div>
      </div>
    </div>
  )
}
