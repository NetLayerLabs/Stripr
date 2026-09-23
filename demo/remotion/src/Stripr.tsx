import React from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import v00 from './vo/v00.json'
import v01 from './vo/v01.json'
import v02 from './vo/v02.json'
import v03 from './vo/v03.json'
import v04 from './vo/v04.json'
import v05 from './vo/v05.json'
import v06 from './vo/v06.json'
import v07 from './vo/v07.json'
import v08 from './vo/v08.json'
import v09 from './vo/v09.json'
import v10 from './vo/v10.json'
import v11 from './vo/v11.json'
import {
  AMBER, AMBER_TINT, BLUE, Backdrop, Body, BrowserFrame, CARD, CLAMP, Card, Chip, Count, Credit, Eyebrow, FAINT, Focus, Hairline,
  HeadLine, Headline, INK, LINE, LINE_2, Lockup, MONO, PANEL, PT, PT_TINT, ProgressRail, RED, Reveal, Rise, SANS, SERIF, SOFT,
  StepNumber, TEXT, TokenLogo, YT, YT_TINT, cardStyle, easeInOut, easeOut, mark,
} from './ui'

/* ------------------------------------------------------------------- timing */

export const FPS = 30
/** Frames of picture before the voice in every scene. */
const LEAD = 8
/** Seconds of air after the voice ends. */
const TAIL: Record<string, number> = { v00: 1.5, v05: 1.3, v11: 2.8 }
const TAIL_DEFAULT = 0.7
/** Cross-fade frames into each scene. */
const FADE = 12

type Words = { text: string; words: { w: string; s: number; e: number }[] }
const VO: Words[] = [v00, v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11]
const IDS = VO.map((_, i) => `v${String(i).padStart(2, '0')}`)
const voEnd = (i: number) => VO[i].words[VO[i].words.length - 1].e

const DURS = VO.map((_, i) => LEAD + Math.round((voEnd(i) + (TAIL[IDS[i]] ?? TAIL_DEFAULT)) * FPS))
const STARTS = DURS.reduce<number[]>((a, _, i) => [...a, i === 0 ? 0 : a[i - 1] + DURS[i - 1]], [])
export const STRIPR_DURATION = DURS.reduce((n, d) => n + d, 0)

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '')
/**
 * Frame, within scene `i`, at which the narration starts the `n`th word beginning with
 * `word`. Every cue in the film is written this way, so graphics land on the word that
 * names them rather than on a hand-timed guess.
 */
const cue = (i: number, word: string, n = 0) => {
  const hits = VO[i].words.filter((w) => norm(w.w).startsWith(norm(word)))
  const w = hits[n]
  if (!w) throw new Error(`v${i}: no word "${word}" #${n}`)
  return LEAD + Math.round(w.s * FPS)
}
/** The same, in scene seconds, for the browser camera. */
const cueS = (i: number, word: string, n = 0) => cue(i, word, n) / FPS

/* ------------------------------------------------------------------ layouts */

const SIDE_W = 1180
/** Type on the left, the app on the right. */
const Side: React.FC<{ step?: number; eyebrow: string; lines: HeadLine[]; children?: React.ReactNode; foot?: React.ReactNode; frame: React.ReactNode }> = ({
  step, eyebrow, lines, children, foot, frame,
}) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: 96, top: 110, width: 520 }}>
      {step !== undefined && (
        <>
          <StepNumber n={step} delay={2} />
          <div style={{ height: 24 }} />
        </>
      )}
      <Eyebrow delay={6}>{eyebrow}</Eyebrow>
      <div style={{ height: 18 }} />
      <Headline lines={lines} delay={10} size={62} />
      <div style={{ height: 40 }} />
      {children}
    </div>
    <div style={{ position: 'absolute', left: 96, bottom: 96, width: 520 }}>{foot}</div>
    <div style={{ position: 'absolute', right: 72, top: 0, bottom: 0, width: SIDE_W, display: 'flex', alignItems: 'center' }}>{frame}</div>
  </AbsoluteFill>
)

const WIDE_W = 1440
/** The app takes the width; one strip beneath carries the chapter, its title, and a credit. */
const Wide: React.FC<{ step: number; eyebrow: string; title: string; title2?: string; swapAt?: number; note?: React.ReactNode; right?: React.ReactNode; frame: React.ReactNode }> = ({
  step, eyebrow, title, title2, swapAt, note, right, frame,
}) => (
  <AbsoluteFill>
    <div style={{ position: 'absolute', left: (1920 - WIDE_W) / 2, top: 24 }}>{frame}</div>
    <div style={{ position: 'absolute', left: (1920 - WIDE_W) / 2, right: (1920 - WIDE_W) / 2, top: 900, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <StepNumber n={step} delay={4} size={104} />
        <div>
          <Eyebrow delay={8} size={18}>{eyebrow}</Eyebrow>
          <div style={{ height: 6 }} />
          <div style={{ position: 'relative', height: 50, width: 820 }}>
            {[title, title2].map((t, i) =>
              t === undefined ? null : (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0 }}>
                  <Reveal delay={i === 0 ? 12 : (swapAt ?? 0) + 8} out={i === 0 && title2 !== undefined ? swapAt : undefined}>
                    <div style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 500, letterSpacing: '-0.018em', color: TEXT, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{t}</div>
                  </Reveal>
                </div>
              ),
            )}
          </div>
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', gap: 12, height: 40, alignItems: 'center' }}>{note}</div>
        </div>
      </div>
      <div style={{ width: 540, flexShrink: 0 }}>{right}</div>
    </div>
  </AbsoluteFill>
)

/* =================================================================== S00 == */
/* Title. */

const InsetFrame: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const f = useCurrentFrame()
  const p = easeInOut(interpolate(f, [delay, delay + 46], [0, 1], CLAMP))
  const c = 'rgba(255,255,255,0.10)'
  const m = 46
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: m, top: m, height: 1.5, width: `calc((100% - ${m * 2}px) * ${p})`, background: c }} />
      <div style={{ position: 'absolute', left: m, top: m, width: 1.5, height: `calc((100% - ${m * 2}px) * ${p})`, background: c }} />
      <div style={{ position: 'absolute', right: m, bottom: m, height: 1.5, width: `calc((100% - ${m * 2}px) * ${p})`, background: c }} />
      <div style={{ position: 'absolute', right: m, bottom: m, width: 1.5, height: `calc((100% - ${m * 2}px) * ${p})`, background: c }} />
    </AbsoluteFill>
  )
}

const S00: React.FC = () => (
  <>
    <Backdrop tone="cover" />
    <InsetFrame delay={2} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -30 }}>
        <Lockup height={190} delay={4} />
        <div style={{ height: 50 }} />
        <Hairline delay={cue(0, 'yield') - 6} width={140} color="rgba(255,255,255,0.35)" />
        <div style={{ height: 34 }} />
        <Reveal delay={cue(0, 'yield')}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 60, color: TEXT, letterSpacing: '-0.01em' }}>Yield stripping for tokenized stocks</div>
        </Reveal>
        <div style={{ height: 22 }} />
        <Eyebrow delay={cue(0, 'solana')} color={YT} size={22}>on Solana</Eyebrow>
      </div>
    </AbsoluteFill>
  </>
)

/* =================================================================== S01 == */
/* The problem: price and dividend, welded into one token. */

const S01: React.FC = () => {
  const f = useCurrentFrame()
  const tPrice = cue(1, 'price')
  const tDiv = cue(1, 'dividends')
  const tTogether = cue(1, 'together')
  const weld = easeInOut(interpolate(f, [tTogether - 10, tTogether + 16], [0, 1], CLAMP))
  const Row: React.FC<{ at: number; label: string; value: string; sub: string; tone: string }> = ({ at, label, value, sub, tone }) => {
    const lit = interpolate(f, [at - 4, at + 12], [0.35, 1], CLAMP)
    return (
      <div style={{ opacity: lit, padding: '26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', textTransform: 'uppercase', color: tone }}>{label}</div>
          <div style={{ height: 8 }} />
          <div style={{ fontFamily: SANS, fontSize: 24, color: SOFT }}>{sub}</div>
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 64, fontWeight: 500, color: TEXT, letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    )
  }
  return (
    <>
      <Backdrop glow="right" />
      <div style={{ position: 'absolute', left: 110, top: 200, width: 740 }}>
        <Eyebrow delay={2}>The problem</Eyebrow>
        <div style={{ height: 26 }} />
        <Headline lines={['A tokenized stock', 'pays you twice.']} delay={6} size={72} stagger={8} />
        <div style={{ height: 6 }} />
        <Headline lines={[{ em: 'You can only sell both.' }]} delay={tTogether - 6} size={72} />
        <div style={{ height: 50 }} />
        <Body delay={tPrice} width={560}>
          Once in its price, and again in its dividends: two different kinds of value, held in one token.
        </Body>
      </div>

      <div style={{ position: 'absolute', left: 900, top: 230, width: 880 }}>
        <Card delay={8} pad={40} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <TokenLogo sym="AAPLx" size={76} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 500, color: TEXT, letterSpacing: '-0.015em' }}>AAPLx</div>
              <div style={{ fontFamily: SANS, fontSize: 23, color: FAINT }}>Apple xStock · Token-2022 on Solana</div>
            </div>
            <Chip tone="plain" delay={14} mono>1 share</Chip>
          </div>
          <div style={{ height: 22 }} />
          <Hairline delay={14} />
          <Row at={tPrice} label="Price" value="$336.10" sub="What the market pays for the share" tone={PT} />
          <Hairline delay={tDiv - 10} />
          <Row at={tDiv} label="Dividends" value="0.25% / yr" sub="Paid into the token's own multiplier" tone={YT} />
          {/* The weld: both rows bound into one thing you can only move whole. */}
          <div
            style={{
              position: 'absolute', left: -26, top: 160, bottom: 34, width: 14, borderRadius: 7, border: `2px solid ${AMBER}`, borderRight: 'none',
              opacity: weld, transform: `scaleY(${weld})`, transformOrigin: 'top',
            }}
          />
        </Card>
        <div style={{ height: 30 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Chip tone="amber" delay={tTogether} dot>Only sold together</Chip>
          <Chip tone="plain" delay={tTogether + 8}>No market for the income alone</Chip>
        </div>
      </div>
    </>
  )
}

/* =================================================================== S02 == */
/* How xStocks pay: a multiplier, not an airdrop. */

const Multiplier: React.FC<{ at: number; to: number }> = ({ at, to }) => {
  const f = useCurrentFrame()
  const p = easeInOut(interpolate(f, [at, to], [0, 1], CLAMP))
  const v = 1.0026642 + (1.003269 - 1.0026642) * p
  const s = v.toFixed(7)
  // The digits that differ between the two readings carry the amber.
  return (
    <span style={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
      <span style={{ color: TEXT }}>{s.slice(0, 5)}</span>
      <span style={{ color: p > 0 ? AMBER : TEXT }}>{s.slice(5)}</span>
    </span>
  )
}

const S02: React.FC = () => {
  const tAir = cue(2, 'airdrop')
  const tMul = cue(2, 'multiplier')
  const tDate = cue(2, 'eighth')
  const tFrom = cue(2, 'moved')
  const tTo = cue(2, 'to', 1)
  const tEnd = cue(2, 'three', 1) + 10
  const tBal = cue(2, 'balance')
  const tReal = cue(2, 'real')
  const tChain = cue(2, 'chain')
  const tNobody = cue(2, 'nobody')
  return (
    <>
      <Backdrop glow="right" />
      <div style={{ position: 'absolute', left: 110, top: 200, width: 600 }}>
        <Eyebrow delay={2}>How xStocks pay</Eyebrow>
        <div style={{ height: 26 }} />
        <Headline lines={['No airdrop.']} delay={tAir - 4} size={92} />
        <Headline lines={[{ em: 'A multiplier.' }]} delay={tMul - 2} size={92} />
        <div style={{ height: 44 }} />
        <Body delay={tBal - 6} width={540}>
          The issuer raises one number on the mint, and every holder's balance grows where it sits.
        </Body>
      </div>

      <div style={{ position: 'absolute', left: 820, top: 150, width: 980 }}>
        <Card delay={tMul} pad={44}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TokenLogo sym="AAPLx" size={48} />
              <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', textTransform: 'uppercase', color: SOFT }}>AAPLx · Scaled UI multiplier</div>
            </div>
            <Chip tone="amber" delay={tDate} mono>8 Aug 2026</Chip>
          </div>
          <div style={{ height: 30 }} />
          <Rise delay={tDate + 4} distance={16}>
            <div style={{ fontSize: 138, lineHeight: 1, fontWeight: 500 }}>
              <Multiplier at={tTo} to={tEnd} />
            </div>
          </Rise>
          <div style={{ height: 18 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Chip tone="yt" delay={tEnd - 4} mono>+0.0603% · one dividend</Chip>
            <Rise delay={tFrom} distance={8}>
              <span style={{ fontFamily: MONO, fontSize: 19, color: FAINT }}>was 1.0026642 → now 1.0032690</span>
            </Rise>
          </div>
          <div style={{ height: 34 }} />
          <Hairline delay={tBal - 8} />
          <div style={{ height: 26 }} />
          <Rise delay={tBal} distance={14}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>100 raw tokens show as</div>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 52, color: TEXT, letterSpacing: '-0.015em' }}>
                <Count from={100.2664} to={100.3269} start={tBal + 6} dur={34} fmt={(n) => n.toFixed(4)} /> <span style={{ fontSize: 28, color: SOFT }}>AAPLx</span>
              </div>
            </div>
          </Rise>
        </Card>
        <div style={{ height: 28 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Chip tone="yt" delay={tReal} dot>Real yield</Chip>
          <Chip tone="blue" delay={tChain}>Already on chain</Chip>
          <Chip tone="amber" delay={tNobody}>Not tradable on its own</Chip>
        </div>
        <div style={{ height: 22 }} />
        <Rise delay={tReal + 10} distance={8}>
          <div style={{ fontFamily: MONO, fontSize: 17, color: FAINT }}>read from mint XsbE…JzJp · Token-2022 ScaledUiAmountConfig</div>
        </Rise>
      </div>
    </>
  )
}

/* =================================================================== S03 == */
/* The split: one share, two tokens, and back again. */

const TokenCard: React.FC<{ tone: 'pt' | 'yt'; delay: number; x: number; title: string; name: string; line: string }> = ({ tone, delay, x, title, name, line }) => {
  const f = useCurrentFrame()
  const p = easeOut(interpolate(f, [delay, delay + 26], [0, 1], CLAMP))
  const c = tone === 'pt' ? PT : YT
  const tint = tone === 'pt' ? PT_TINT : YT_TINT
  return (
    <div
      style={{
        position: 'absolute', left: 960 + x * p - 280, top: 470, width: 560, opacity: Math.min(1, p * 1.5),
        ...cardStyle, padding: 38, borderColor: `${c}55`, boxShadow: `${cardStyle.boxShadow}, 0 0 80px -30px ${c}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 62, height: 62, borderRadius: 99, background: tint, border: `1.5px solid ${c}66`, display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 22, color: c }}>
          {title}
        </span>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 38, color: TEXT, fontWeight: 500 }}>{title}-AAPLx</div>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.14em', textTransform: 'uppercase', color: c }}>{name}</div>
        </div>
      </div>
      <div style={{ height: 22 }} />
      <div style={{ fontFamily: SANS, fontSize: 28, color: SOFT, lineHeight: 1.35 }}>{line}</div>
    </div>
  )
}

const S03: React.FC = () => {
  const f = useCurrentFrame()
  const tSplit = cue(3, 'splits')
  const tPT = cue(3, 'pt')
  const tYT = cue(3, 'yt')
  const tBurn = cue(3, 'burn')
  const tBack = cue(3, 'back')
  const share = interpolate(f, [tSplit + 4, tSplit + 22], [1, 0], CLAMP)
  const join = easeInOut(interpolate(f, [tBurn, tBurn + 24], [0, 1], CLAMP))
  return (
    <>
      <Backdrop glow="left" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Eyebrow delay={2}>The split</Eyebrow>
        <div style={{ height: 22 }} />
        <div style={{ display: 'flex', gap: 22, alignItems: 'baseline' }}>
          <Headline lines={['One share.']} delay={tSplit - 6} size={84} />
          <Headline lines={[{ em: 'Two tokens.' }]} delay={tSplit + 2} size={84} />
        </div>
      </div>

      {/* The share itself, before it comes apart. */}
      <div style={{ position: 'absolute', left: 960 - 230, top: 480, width: 460, opacity: share, transform: `scale(${0.9 + share * 0.1})`, ...cardStyle, padding: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <TokenLogo sym="AAPLx" size={70} />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 44, color: TEXT }}>1 AAPLx</div>
            <div style={{ fontFamily: SANS, fontSize: 22, color: FAINT }}>one tokenized share</div>
          </div>
        </div>
      </div>

      <TokenCard tone="pt" delay={tPT - 6} x={-330} title="PT" name="Principal token" line="The claim on the stock itself." />
      <TokenCard tone="yt" delay={tYT - 6} x={330} title="YT" name="Yield token" line="Every dividend the share will ever pay." />

      {/* Burn both, get the share back. */}
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        {[-330, 330].map((x) => (
          <path
            key={x}
            d={`M ${960 + x} 700 C ${960 + x} 790, 960 780, 960 850`}
            fill="none"
            stroke={x < 0 ? PT : YT}
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - join}
            opacity={0.8}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Chip tone="plain" delay={tBurn + 14} mono>burn PT + YT</Chip>
        <Chip tone="amber" delay={tBack - 4} dot>= 1 AAPLx back</Chip>
      </div>
    </>
  )
}

/* =================================================================== S04 == */
/* 01 · Live on mainnet: fifteen markets. */

const TICKERS = ['AAPLx', 'MSFTx', 'NVDAx', 'GOOGLx', 'METAx', 'AMZNx', 'TSLAx', 'SPYx', 'QQQx', 'KOx', 'PGx', 'JNJx', 'MCDx', 'COINx', 'MSTRx']

const S04: React.FC = () => {
  const tFif = cue(4, 'fifteen')
  const tEvery = cue(4, 'every', 1)
  const RATE = 1.25
  const s = (clipSec: number) => clipSec / RATE
  const table = mark('markets', 'table').rect
  const page2 = mark('markets', 'page2')
  const focus: Focus[] = [
    { rect: [table[0], table[1] + 10, 760, 430], from: cueS(4, 'fifteen'), to: s(5.2), move: 1.2 },
    // After the pager turns, hold on the second page's rows rather than pulling back to an unreadable table.
    { rect: [page2.rect[0], page2.rect[1] + 10, 760, 430], from: s(page2.t) + 0.1, to: 99, move: 1.0 },
  ]
  return (
    <>
      <Backdrop glow="right" />
      <Side
        step={1}
        eyebrow="Live on mainnet"
        lines={['Fifteen markets,', { em: 'one per xStock.' }]}
        frame={<BrowserFrame shots={[{ clip: 'markets', playbackRate: RATE, path: '/app' }]} width={SIDE_W} delay={4} dur={DURS[4]} focus={focus} />}
        foot={<Credit from={tEvery} name="Solana mainnet" kicker="Deployed on" role="Program 9wpHm…nzZF · quoted in USDC" width={520} />}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 64px)', gap: 20 }}>
          {TICKERS.map((t, i) => (
            <Rise key={t} delay={tFif + i * 2} distance={12}>
              <TokenLogo sym={t} size={64} />
            </Rise>
          ))}
        </div>
      </Side>
    </>
  )
}

/* =================================================================== S05 == */
/* 02 · Strip: a real devnet transaction. */

const S05: React.FC = () => {
  const form = mark('strip', 'form').rect
  const dialog = mark('strip', 'confirmed').rect
  const tDialog = mark('strip', 'dialog').t
  const focus: Focus[] = [
    { rect: form, from: 0.4, to: 3.3, move: 1 },
    { rect: [dialog[0] - 30, dialog[1] - 20, dialog[2] + 60, dialog[3] + 40], from: tDialog - 0.2, to: 99, move: 0.9 },
  ]
  return (
    <>
      <Backdrop glow="left" />
      <Wide
        step={2}
        eyebrow="Strip"
        title="Stock in. PT and YT out."
        title2="YT locked, and earning."
        swapAt={cue(5, 'locks')}
        note={
          <>
            <Chip tone="yt" delay={cue(5, 'one')} size={19}>One transaction</Chip>
            <Chip tone="plain" delay={cue(5, 'mints')} size={19} mono>strip + lock_yt</Chip>
          </>
        }
        right={<Credit from={cue(5, 'transaction')} name="Solana devnet" kicker="Filmed live" role="A real transaction, confirmed on chain" />}
        frame={<BrowserFrame shots={[{ clip: 'strip', path: '/app/markets/5skj…DEPT' }]} width={WIDE_W} delay={2} dur={DURS[5]} pushIn={[1, 1.01]} focus={focus} />}
      />
    </>
  )
}

/* =================================================================== S06 == */
/* 03 · Earn: where the surplus comes from. */

const VaultRow: React.FC<{ label: string; delay: number; children: React.ReactNode; tone?: string }> = ({ label, delay, children, tone = FAINT }) => (
  <Rise delay={delay} distance={12}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0' }}>
      <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.13em', textTransform: 'uppercase', color: tone }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 40, color: TEXT, letterSpacing: '-0.02em' }}>{children}</span>
    </div>
  </Rise>
)

const S06: React.FC = () => {
  const f = useCurrentFrame()
  const tRaise = cue(6, 'raises')
  const tFewer = cue(6, 'fewer')
  const tSurplus = cue(6, 'surplus')
  const tStock = cue(6, 'stock')
  const tAnyone = cue(6, 'anyone')
  const tOracle = cue(6, 'oracle')
  const tAdmin = cue(6, 'admin')
  const split = easeInOut(interpolate(f, [tSurplus - 4, tSurplus + 22], [0, 1], CLAMP))
  const BAR = 860
  const sliver = 70 * split // drawn wide enough to see; the true share is 0.06%
  return (
    <>
      <Backdrop glow="right" />
      <div style={{ position: 'absolute', left: 110, top: 150, width: 560 }}>
        <StepNumber n={3} delay={2} />
        <div style={{ height: 24 }} />
        <Eyebrow delay={6}>Earn</Eyebrow>
        <div style={{ height: 20 }} />
        <Headline lines={['The surplus', 'goes to', { em: 'locked YT.' }]} delay={10} size={80} stagger={7} />
        <div style={{ height: 40 }} />
        <Body delay={tStock - 6} width={520}>
          Paid in the stock itself, not in a wrapped reward or an IOU.
        </Body>
      </div>

      <div style={{ position: 'absolute', left: 780, top: 170, width: 1020 }}>
        <Card delay={tRaise - 6} pad={44}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', textTransform: 'uppercase', color: SOFT }}>Market vault · AAPLx</div>
            <Chip tone="plain" size={18} mono delay={tRaise}>100 raw tokens deposited</Chip>
          </div>
          <div style={{ height: 14 }} />
          <VaultRow label="Multiplier" delay={tRaise}>
            <Count from={1.0026642} to={1.003269} start={tRaise + 6} dur={30} fmt={(n) => n.toFixed(7)} />
          </VaultRow>
          <Hairline delay={tRaise + 4} />
          <VaultRow label="Shares owed to PT + YT" delay={tRaise + 8}>100.2664</VaultRow>
          <Hairline delay={tFewer - 4} />
          <VaultRow label="Raw tokens needed now" delay={tFewer}>
            <Count from={100} to={99.9397} start={tFewer + 4} dur={30} fmt={(n) => n.toFixed(4)} />
          </VaultRow>
          <div style={{ height: 22 }} />
          {/* The vault's raw tokens: what backs the shares, and what is left over. */}
          <Rise delay={tFewer + 6} distance={10}>
            <div style={{ display: 'flex', height: 54, width: BAR, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${LINE_2}` }}>
              <div style={{ width: BAR - sliver, background: `linear-gradient(90deg, ${PT_TINT}, rgba(125,211,252,0.28))`, display: 'flex', alignItems: 'center', paddingLeft: 20, fontFamily: MONO, fontSize: 18, color: PT }}>
                99.9397 back the shares
              </div>
              <div style={{ width: sliver, background: YT, boxShadow: `0 0 30px ${YT}` }} />
            </div>
          </Rise>
          <div style={{ height: 16 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Chip tone="yt" delay={tSurplus + 6} mono dot>0.0603 AAPLx → locked YT</Chip>
            <Rise delay={tSurplus + 14} distance={6}>
              <span style={{ fontFamily: MONO, fontSize: 16, color: FAINT }}>surplus drawn wider than scale</span>
            </Rise>
          </div>
        </Card>
        <div style={{ height: 30 }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Chip tone="blue" delay={tAnyone} mono>sync_multiplier · anyone can call</Chip>
          <Chip tone="plain" delay={tOracle}>No oracle</Chip>
          <Chip tone="plain" delay={tAdmin}>No admin key</Chip>
        </div>
      </div>
    </>
  )
}

/* =================================================================== S07 == */
/* 04 · Trade: sell future dividends for USDC. */

const S07: React.FC = () => {
  const RATE = 0.86
  const book = mark('book', 'book').rect
  const quote = mark('book', 'quote').rect
  const focus: Focus[] = [
    { rect: [book[0], book[1] - 10, book[2], book[3] + 20], from: cueS(7, 'list') - 0.4, to: cueS(7, 'buyer') - 1.2, move: 1.1 },
    { rect: [quote[0] - 20, quote[1] - 20, quote[2] + 40, quote[3] + 40], from: cueS(7, 'buyer') - 0.6, to: 99, move: 1.1 },
  ]
  return (
    <>
      <Backdrop glow="right" />
      <Wide
        step={4}
        eyebrow="Trade"
        title="Sell future dividends for USDC."
        title2="Filled at the price shown."
        swapAt={cue(7, 'buyer')}
        note={
          <>
            <Chip tone="yt" delay={cue(7, 'escrow')} size={19}>Escrowed by the program</Chip>
            <Chip tone="plain" delay={cue(7, 'exact')} size={19} mono>fill_offer checks the price</Chip>
          </>
        }
        right={<Credit from={cue(7, 'list')} name="Order book" kicker="On chain" role="PT and YT, priced in USDC" />}
        frame={<BrowserFrame shots={[{ clip: 'book', playbackRate: RATE, path: '/app/markets/5skj…DEPT' }]} width={WIDE_W} delay={2} dur={DURS[7]} pushIn={[1, 1.01]} focus={focus} />}
      />
    </>
  )
}

/* =================================================================== S08 == */
/* 05 · Priced, not guessed: realized rates, and what they make a YT worth. */

const RATES: [string, number][] = [
  ['KOx', 1.75], ['PGx', 1.67], ['MCDx', 1.64], ['JNJx', 1.52], ['MSFTx', 0.46], ['SPYx', 0.44], ['QQQx', 0.27], ['AAPLx', 0.25],
]

const S08: React.FC = () => {
  const f = useCurrentFrame()
  const tMeasured = cue(8, 'measured')
  const tPG = cue(8, 'procter')
  const tYT = cue(8, 'yt')
  const tTwenty = cue(8, 'twenty-eight')
  const tPays = cue(8, 'pays')
  const focusPG = interpolate(f, [tPG, tPG + 14], [0, 1], CLAMP)
  const MAXW = 520
  return (
    <>
      <Backdrop glow="left" />
      <div style={{ position: 'absolute', left: 110, top: 150, width: 560 }}>
        <StepNumber n={5} delay={2} />
        <div style={{ height: 24 }} />
        <Eyebrow delay={6}>Priced, not guessed</Eyebrow>
        <div style={{ height: 20 }} />
        <Headline lines={['Every listing', { em: 'carries a yield.' }]} delay={10} size={80} stagger={8} />
        <div style={{ height: 40 }} />
        <Body delay={tMeasured} width={520}>
          Each rate is measured from the stock's own multiplier since the token launched. Nothing is estimated.
        </Body>
      </div>

      <div style={{ position: 'absolute', left: 800, top: 96, width: 1000 }}>
        <Card delay={tMeasured - 8} pad={36}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: SERIF, fontSize: 34, color: TEXT }}>Dividend rate, realized</div>
            <div style={{ fontFamily: MONO, fontSize: 17, color: FAINT, letterSpacing: '0.1em' }}>PER YEAR · LIVE FROM MAINNET</div>
          </div>
          <div style={{ height: 20 }} />
          {RATES.map(([sym, r], i) => {
            const grow = easeOut(interpolate(f, [tMeasured + i * 3, tMeasured + i * 3 + 26], [0, 1], CLAMP))
            const isPG = sym === 'PGx'
            const dim = isPG ? 1 : 1 - 0.55 * focusPG
            return (
              <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 16, height: 48, opacity: dim }}>
                <TokenLogo sym={sym} size={34} />
                <span style={{ fontFamily: MONO, fontSize: 20, color: isPG && focusPG > 0.5 ? AMBER : SOFT, width: 90 }}>{sym}</span>
                <div style={{ flex: 1, position: 'relative', height: 16 }}>
                  <div
                    style={{
                      position: 'absolute', left: 0, top: 0, height: 16, borderRadius: 8, width: (r / 1.75) * MAXW * grow,
                      background: isPG && focusPG > 0.5 ? AMBER : `linear-gradient(90deg, rgba(52,211,153,0.5), ${YT})`,
                    }}
                  />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 22, color: TEXT, width: 90, textAlign: 'right', opacity: grow }}>{r.toFixed(2)}%</span>
              </div>
            )
          })}
        </Card>

        <div style={{ height: 26 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Card delay={tYT - 10} pad={26} style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: FAINT }}>PGx PAYS</div>
            <div style={{ fontFamily: SERIF, fontSize: 50, color: TEXT }}>$2.47</div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT }}>per share, per year</div>
          </Card>
          <Rise delay={tYT} distance={8}><span style={{ fontFamily: SERIF, fontSize: 60, color: FAINT }}>÷</span></Rise>
          <Card delay={tYT} pad={26} style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: FAINT }}>YT PRICE</div>
            <div style={{ fontFamily: SERIF, fontSize: 50, color: TEXT }}>8.78</div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT }}>USDC</div>
          </Card>
          <Rise delay={tTwenty - 6} distance={8}><span style={{ fontFamily: SERIF, fontSize: 60, color: FAINT }}>=</span></Rise>
          <Card delay={tTwenty - 4} pad={26} style={{ flex: 1.1, borderColor: `${YT}66`, boxShadow: `${cardStyle.boxShadow}, 0 0 80px -34px ${YT}` }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: YT }}>YIELD</div>
            <div style={{ fontFamily: SERIF, fontSize: 64, color: YT, lineHeight: 1 }}>
              <Count from={0} to={28.1} start={tTwenty - 2} dur={22} fmt={(n) => `${n.toFixed(0)}%`} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT }}>a year</div>
          </Card>
        </div>
        <div style={{ height: 18 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Chip tone="amber" delay={tPays} dot>Pays for itself in 3.6 years</Chip>
        </div>
      </div>
    </>
  )
}

/* =================================================================== S09 == */
/* 06 · Verifiable: analytics decoded from the program's own events. */

const S09: React.FC = () => {
  const RATE = 1.2
  const s = (c: number) => c / RATE
  const supply = mark('analytics', 'supply').rect
  const re = mark('analytics', 'reinvested')
  const focus: Focus[] = [
    { rect: supply, from: 0.5, to: s(3.9), move: 1 },
    { rect: [re.rect[0] - 10, re.rect[1] - 10, re.rect[2] + 20, re.rect[3] + 20], from: s(re.t) - 0.2, to: 99, move: 1.1 },
  ]
  return (
    <>
      <Backdrop glow="left" />
      <Wide
        step={6}
        eyebrow="Verifiable"
        title="Rebuilt from on-chain events."
        title2="Every row links its transaction."
        swapAt={cue(9, 'row') - 8}
        note={<Chip tone="yt" delay={cue(9, 'nothing')} size={19}>Nothing precomputed</Chip>}
        right={<Credit from={cue(9, 'chart')} name="Market analytics" kicker="Read live" role="Decoded from Stripr's own program events" />}
        frame={<BrowserFrame shots={[{ clip: 'analytics', playbackRate: RATE, path: '/app/markets/5skj…DEPT' }]} width={WIDE_W} delay={2} dur={DURS[9]} pushIn={[1, 1.01]} focus={focus} />}
      />
    </>
  )
}

/* =================================================================== S10 == */
/* 07 · Under the hood. */

const CODE = [
  ['// distribute: one index update, whatever the holder count', true],
  ['acc_dividend_per_yt += amount * ACC / total_yt_locked;', false],
  ['', false],
  ['// settle: what a position earned since it last moved', true],
  ['let accrued = yt_locked * acc_dividend_per_yt / ACC;', false],
  ['unclaimed += accrued - dividend_debt;', false],
] as const

const Typed: React.FC<{ start: number; cps?: number }> = ({ start, cps = 70 }) => {
  const f = useCurrentFrame()
  let budget = Math.max(0, ((f - start) / FPS) * cps)
  return (
    <div style={{ fontFamily: MONO, fontSize: 22, lineHeight: 1.75 }}>
      {CODE.map(([line, comment], i) => {
        const shown = line.slice(0, Math.max(0, Math.floor(budget)))
        budget -= line.length + 4
        return (
          <div key={i} style={{ color: comment ? FAINT : TEXT, whiteSpace: 'pre', minHeight: 38 }}>
            {shown}
            {shown.length > 0 && shown.length < line.length ? <span style={{ background: YT, marginLeft: 2 }}>&nbsp;</span> : null}
          </div>
        )
      })}
    </div>
  )
}

const S10: React.FC = () => {
  const f = useCurrentFrame()
  const tAcc = cue(10, 'accumulator')
  const tTen = cue(10, 'ten')
  const tThousand = cue(10, 'thousand')
  const tAccrual = cue(10, 'accrual')
  const tDebt = cue(10, 'debt')
  const tExceed = cue(10, 'exceed')
  const tNineteen = cue(10, 'nineteen')
  const tApple = cue(10, 'apple')
  const bar = (at: number) => easeOut(interpolate(f, [at, at + 20], [0, 1], CLAMP))
  return (
    <>
      <Backdrop glow="right" />
      <div style={{ position: 'absolute', left: 110, top: 150, width: 560 }}>
        <StepNumber n={7} delay={2} />
        <div style={{ height: 24 }} />
        <Eyebrow delay={6}>Under the hood</Eyebrow>
        <div style={{ height: 20 }} />
        <Headline lines={['One Anchor', 'program.', { em: 'Boring on purpose.' }]} delay={10} size={66} stagger={7} />
      </div>

      <div style={{ position: 'absolute', left: 780, top: 110, width: 1030 }}>
        <Card delay={tAcc - 16} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1.5px solid ${LINE}`, background: '#0C1016' }}>
            <span style={{ fontFamily: MONO, fontSize: 18, color: SOFT }}>programs/stripr/src/state.rs</span>
            <span style={{ fontFamily: MONO, fontSize: 18, color: FAINT }}>checked u128 math</span>
          </div>
          <div style={{ padding: '22px 30px 26px' }}>
            <Typed start={tAcc} />
          </div>
        </Card>
        <div style={{ height: 24 }} />
        <div style={{ display: 'flex', gap: 20 }}>
          <Card delay={tTen - 8} pad={28} style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: FAINT }}>COST PER PAYOUT</div>
            <div style={{ height: 14 }} />
            {[['10 holders', tTen], ['10,000 holders', tThousand]].map(([label, at]) => (
              <div key={label as string} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT, marginBottom: 6 }}>{label}</div>
                <div style={{ height: 12, borderRadius: 6, background: BLUE, width: `${bar(at as number) * 100}%` }} />
              </div>
            ))}
            <Chip tone="blue" delay={tThousand + 8} mono size={19}>O(1)</Chip>
          </Card>
          <Card delay={tAccrual - 8} pad={28} style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: FAINT }}>SOLVENT BY ROUNDING</div>
            <div style={{ height: 16 }} />
            <Rise delay={tAccrual} distance={8}><div style={{ fontFamily: SANS, fontSize: 22, color: TEXT }}>Accrual <span style={{ color: YT }}>rounds down ↓</span></div></Rise>
            <div style={{ height: 10 }} />
            <Rise delay={tDebt} distance={8}><div style={{ fontFamily: SANS, fontSize: 22, color: TEXT }}>Debt <span style={{ color: AMBER }}>rounds up ↑</span></div></Rise>
            <div style={{ height: 18 }} />
            <Chip tone="yt" delay={tExceed} mono size={19}>claims ≤ vault</Chip>
          </Card>
          <Card delay={tNineteen - 8} pad={28} style={{ flex: 1, borderColor: `${YT}55` }}>
            <div style={{ fontFamily: MONO, fontSize: 16, letterSpacing: '0.12em', color: FAINT }}>END-TO-END TESTS</div>
            <div style={{ fontFamily: SERIF, fontSize: 104, color: TEXT, lineHeight: 1.05 }}>
              <Count from={0} to={19} start={tNineteen} dur={24} fmt={(n) => String(Math.round(n))} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT }}>passing on a local validator</div>
            <div style={{ height: 14 }} />
            <Chip tone="amber" delay={tApple} size={18}>incl. the real AAPLx mint</Chip>
          </Card>
        </div>
      </div>
    </>
  )
}

/* =================================================================== S11 == */
/* Close. */

const S11: React.FC = () => {
  const tLine = cue(11, 'a')
  const tLive = cue(11, 'live')
  const tUrl = cue(11, 'stripr', 1)
  return (
    <>
      <Backdrop tone="cover" />
      <InsetFrame delay={2} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40 }}>
          <Lockup height={150} delay={2} />
          <div style={{ height: 44 }} />
          <Hairline delay={tLine - 8} width={140} color="rgba(255,255,255,0.35)" />
          <div style={{ height: 34 }} />
          <Headline lines={["A share's dividends, as an asset", { em: 'you can own, price and sell.' }]} delay={tLine} size={58} align="center" />
          <div style={{ height: 46 }} />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Chip tone="yt" delay={tUrl - 4} size={30} dot>stripr.xyz</Chip>
            <Chip tone="plain" delay={tLive} size={22}>Live on Solana mainnet</Chip>
            <Chip tone="plain" delay={tLive + 5} size={22}>15 markets</Chip>
            <Chip tone="plain" delay={tLive + 10} size={22}>Built for Stocklana</Chip>
          </div>
        </div>
      </AbsoluteFill>
    </>
  )
}

/* ================================================================ assembly == */

const BODIES: React.FC[] = [S00, S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11]

const Scene: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame()
  const o = first ? 1 : interpolate(f, [0, FADE], [0, 1], CLAMP)
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

export const Stripr: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    {BODIES.map((Body_, i) => (
      <Sequence key={IDS[i]} from={STARTS[i]} durationInFrames={DURS[i] + (i === BODIES.length - 1 ? 0 : FADE)} name={IDS[i]} premountFor={30}>
        <Scene first={i === 0}>
          <Body_ />
        </Scene>
        <Sequence from={LEAD} layout="none">
          <Audio src={staticFile(`vo/${IDS[i]}.mp3`)} volume={1.6} />
        </Sequence>
      </Sequence>
    ))}
    <ProgressRail total={STRIPR_DURATION} />
  </AbsoluteFill>
)

// Unused-import guard for tokens kept for later scenes.
void [AMBER_TINT, CARD, PANEL, RED]
