import React from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import t00 from './vo-tech/t00.json'
import t01 from './vo-tech/t01.json'
import t02 from './vo-tech/t02.json'
import t03 from './vo-tech/t03.json'
import t04 from './vo-tech/t04.json'
import t05 from './vo-tech/t05.json'
import t06 from './vo-tech/t06.json'
import t07 from './vo-tech/t07.json'
import t08 from './vo-tech/t08.json'
import t09 from './vo-tech/t09.json'
import t10 from './vo-tech/t10.json'
import {
  AMBER, BLUE, Backdrop, CLAMP, Card, Chip, Count, Eyebrow, FAINT, Hairline, HeadLine, Headline, INK, LINE, LINE_2, Lockup, MONO,
  PT, PT_TINT, ProgressRail, Reveal, Rise, SANS, SERIF, SOFT, StepNumber, TEXT, YT, YT_TINT, cardStyle, easeInOut, easeOut,
} from './ui'

/**
 * The technical cut. Every line of code on screen is copied verbatim from
 * programs/stripr/src with its real line number, and every claim in the narration
 * was checked against the source by independent reviewers before it was voiced.
 */

export const TECH_FPS = 30
// Kept tight so the cut stays under two minutes without trimming what it says.
const LEAD = 6
const TAIL: Record<string, number> = { t00: 0.8, t10: 2.0 }
const TAIL_DEFAULT = 0.45
const FADE = 12

type Words = { text: string; words: { w: string; s: number; e: number }[] }
const VO: Words[] = [t00, t01, t02, t03, t04, t05, t06, t07, t08, t09, t10]
const IDS = VO.map((_, i) => `t${String(i).padStart(2, '0')}`)
const DURS = VO.map((v, i) => LEAD + Math.round((v.words[v.words.length - 1].e + (TAIL[IDS[i]] ?? TAIL_DEFAULT)) * TECH_FPS))
const STARTS = DURS.reduce<number[]>((a, _, i) => [...a, i === 0 ? 0 : a[i - 1] + DURS[i - 1]], [])
export const TECH_DURATION = DURS.reduce((n, d) => n + d, 0)

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '')
/** Frame in scene `i` at which the narration starts the `n`th word beginning with `word`. */
const cue = (i: number, word: string, n = 0) => {
  const hits = VO[i].words.filter((w) => norm(w.w).startsWith(norm(word)))
  if (!hits[n]) throw new Error(`t${i}: no word "${word}" #${n}`)
  return LEAD + Math.round(hits[n].s * TECH_FPS)
}

/* ------------------------------------------------------------------ pieces */

/** Chapter type on the left, the evidence on the right. */
const Split: React.FC<{ step: number; eyebrow: string; lines: HeadLine[]; body?: React.ReactNode; children: React.ReactNode }> = ({
  step, eyebrow, lines, body, children,
}) => (
  <AbsoluteFill>
    {/* Both columns sit on the frame's centre line, so a short scene doesn't leave the lower half empty. */}
    <div style={{ position: 'absolute', left: 110, top: 0, bottom: 40, width: 560, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <StepNumber n={step} delay={2} />
      <div style={{ height: 24 }} />
      <Eyebrow delay={6}>{eyebrow}</Eyebrow>
      <div style={{ height: 20 }} />
      <Headline lines={lines} delay={10} size={70} stagger={7} />
      {body ? <div style={{ marginTop: 36 }}>{body}</div> : null}
    </div>
    <div style={{ position: 'absolute', left: 736, top: 0, bottom: 40, width: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Laid out at 1000px and enlarged, so code and figures read at full-frame size. */}
      <div style={{ transform: 'scale(1.14)', transformOrigin: 'left center' }}>{children}</div>
    </div>
  </AbsoluteFill>
)

/** A verbatim excerpt of the program, with its real file and line numbers. */
const Code: React.FC<{ file: string; start: number; lines: string[]; delay: number; mark?: { line: number; at: number }; width?: number }> = ({
  file, start, lines, delay, mark, width,
}) => {
  const f = useCurrentFrame()
  const hi = mark ? easeInOut(interpolate(f, [mark.at, mark.at + 12], [0, 1], CLAMP)) : 0
  return (
    <Card delay={delay} pad={0} width={width} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 26px', borderBottom: `1.5px solid ${LINE}`, background: '#0C1016' }}>
        <span style={{ fontFamily: MONO, fontSize: 17, color: SOFT }}>{file}</span>
        <span style={{ fontFamily: MONO, fontSize: 17, color: FAINT }}>
          lines {start}-{start + lines.length - 1}
        </span>
      </div>
      <div style={{ padding: '16px 0 18px' }}>
        {lines.map((l, i) => {
          const isMark = mark && mark.line === start + i
          return (
            <Rise key={i} delay={delay + 6 + i * 3} distance={6}>
              <div
                style={{
                  display: 'flex', fontFamily: MONO, fontSize: 20, lineHeight: '35px', whiteSpace: 'pre',
                  background: isMark ? `rgba(237,164,58,${0.14 * hi})` : 'transparent',
                  boxShadow: isMark ? `inset 3px 0 0 rgba(237,164,58,${hi})` : 'none',
                }}
              >
                <span style={{ width: 70, textAlign: 'right', paddingRight: 22, color: 'rgba(255,255,255,0.22)' }}>{start + i}</span>
                <span style={{ color: l.trim().startsWith('//') ? FAINT : TEXT }}>{l}</span>
              </div>
            </Rise>
          )
        })}
      </div>
    </Card>
  )
}

const Box: React.FC<{ title: string; sub?: string; delay: number; tone?: string; w?: number }> = ({ title, sub, delay, tone = LINE_2, w }) => (
  <Rise delay={delay} distance={12}>
    <div style={{ ...cardStyle, padding: '16px 20px', width: w, borderColor: tone }}>
      <div style={{ fontFamily: MONO, fontSize: 20, color: TEXT }}>{title}</div>
      {sub ? <div style={{ fontFamily: MONO, fontSize: 15, color: FAINT, marginTop: 4 }}>{sub}</div> : null}
    </div>
  </Rise>
)

const Rail: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const f = useCurrentFrame()
  const p = easeInOut(interpolate(f, [delay, delay + 16], [0, 1], CLAMP))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0 10px 40px' }}>
      <div style={{ width: 2, height: 30, background: `linear-gradient(${YT}, rgba(255,255,255,0.1))`, transform: `scaleY(${p})`, transformOrigin: 'top' }} />
      <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT, opacity: p }}>{label}</span>
    </div>
  )
}

/* =================================================================== T00 == */

const T00: React.FC = () => (
  <>
    <Backdrop tone="cover" />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -30 }}>
        <Lockup height={160} delay={2} />
        <div style={{ height: 46 }} />
        <Hairline delay={16} width={140} color="rgba(255,255,255,0.35)" />
        <div style={{ height: 30 }} />
        <Reveal delay={cue(0, 'under')}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, color: TEXT }}>Under the hood</div>
        </Reveal>
        <div style={{ height: 20 }} />
        <Eyebrow delay={cue(0, 'hood')} size={20}>Anchor · Token-2022 · Solana mainnet</Eyebrow>
      </div>
    </AbsoluteFill>
  </>
)

/* =================================================================== T01 == */

const INSTRUCTIONS = [
  'initialize_market', 'strip', 'redeem', 'lock_yt', 'unlock_yt', 'distribute_dividend',
  'claim_yield', 'sync_multiplier', 'claim_stock_yield', 'create_offer', 'fill_offer', 'cancel_offer',
]

const T01: React.FC = () => {
  const tTwelve = cue(1, 'twelve')
  const tMarket = cue(1, 'market')
  const tMints = cue(1, 'mints')
  const tHolds = cue(1, 'holds')
  const tAdmin = cue(1, 'admin')
  const tUpgrade = cue(1, 'upgrade')
  return (
    <>
      <Backdrop glow="right" />
      <Split
        step={1}
        eyebrow="Architecture"
        lines={['One program.', { em: 'Twelve instructions.' }]}
        body={
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 18px' }}>
            {INSTRUCTIONS.map((n, i) => (
              <Rise key={n} delay={tTwelve + i * 2} distance={8}>
                <span style={{ fontFamily: MONO, fontSize: 19, color: SOFT }}>{n}</span>
              </Rise>
            ))}
          </div>
        }
      >
        <Box title="Market" sub={'PDA · seeds ["market", stock_mint]'} delay={tMarket - 4} tone={`${AMBER}88`} w={560} />
        <Rail label="mint authority" delay={tMints - 6} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Box title="PT mint" delay={tMints} tone={`${PT}66`} w={270} />
          <Box title="YT mint" delay={tMints + 3} tone={`${YT}66`} w={270} />
        </div>
        <Rail label="token authority" delay={tHolds - 6} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Box title="Stock vault" sub="the deposited shares" delay={tHolds} w={270} />
          <Box title="YT escrow" sub="locked YT" delay={tHolds + 3} w={230} />
          <Box title="Dividend vault" sub="USDC payouts" delay={tHolds + 6} w={250} />
        </div>
        <div style={{ height: 34 }} />
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Chip tone="yt" delay={tAdmin} dot>No admin instruction can touch the vault</Chip>
          <Chip tone="amber" delay={tUpgrade} mono>program upgrade authority 3EGK…vSy</Chip>
          <Chip tone="plain" delay={cue(1, 'permanent')} mono>issuer's permanent delegate</Chip>
        </div>
      </Split>
    </>
  )
}

/* =================================================================== T02 == */

const T02: React.FC = () => {
  const tUnits = cue(2, 'units')
  const tDeposit = cue(2, 'before')
  const tStill = cue(2, 'still')
  return (
    <>
      <Backdrop glow="left" />
      <Split step={2} eyebrow="Share units" lines={['A share is', { em: 'still a share.' }]}>
        <Code
          file="programs/stripr/src/state.rs"
          start={70}
          delay={tUnits - 10}
          lines={[
            'pub fn shares_for_raw(&self, raw: u64) -> Result<u64> {',
            '    let shares = (raw as u128)',
            '        .checked_mul(self.multiplier)',
            '        .ok_or(StriprError::MathOverflow)?',
            '        / MULTIPLIER_ONE;',
          ]}
        />
        <div style={{ height: 24 }} />
        <Card delay={tDeposit - 4} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>AAPLX · 100 RAW TOKENS DEPOSITED</div>
          <div style={{ height: 14 }} />
          {[
            ['Before 8 Aug', '1.0026642', '100.2664', tDeposit],
            ['After 8 Aug', '1.0032690', '100.3269', tDeposit + 12],
          ].map(([when, m, s, at]) => (
            <Rise key={when as string} delay={at as number} distance={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 24, padding: '10px 0', color: TEXT }}>
                <span style={{ color: SOFT, width: 200 }}>{when}</span>
                <span>100 × {m}</span>
                <span style={{ color: YT }}>= {s} shares</span>
              </div>
            </Rise>
          ))}
          <div style={{ height: 12 }} />
          <Chip tone="plain" delay={tStill} size={19}>PT and YT count shares, not raw tokens</Chip>
        </Card>
      </Split>
    </>
  )
}

/* =================================================================== T03 == */

const T03: React.FC = () => {
  const f = useCurrentFrame()
  const tRead = cue(3, 'read')
  const tScheduled = cue(3, 'scheduled')
  const tStamp = cue(3, 'effective')
  const now = easeInOut(interpolate(f, [tScheduled, tStamp + 10], [0.15, 0.82], CLAMP))
  return (
    <>
      <Backdrop glow="right" />
      <Split step={3} eyebrow="Reading the mint" lines={['Straight from', { em: 'the mint.' }]}>
        <Code
          file="programs/stripr/src/multiplier.rs"
          start={28}
          delay={tRead - 10}
          mark={{ line: 29, at: tStamp }}
          lines={[
            'let effective_at: i64 = config.new_multiplier_effective_timestamp.into();',
            'let multiplier: f64 = if Clock::get()?.unix_timestamp >= effective_at {',
            '    config.new_multiplier.into()',
            '} else {',
            '    config.multiplier.into()',
            '};',
          ]}
        />
        <div style={{ height: 28 }} />
        <Card delay={tScheduled - 6} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>AAPLX · SCALED UI AMOUNT CONFIG</div>
          <div style={{ height: 26 }} />
          <div style={{ position: 'relative', height: 80 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', left: 0, top: 30, height: 4, borderRadius: 4, width: `${now * 100}%`, background: `linear-gradient(90deg, ${BLUE}, ${YT})` }} />
            <div style={{ position: 'absolute', left: '50%', top: 12, width: 2, height: 40, background: AMBER }} />
            <div style={{ position: 'absolute', left: '50%', top: 58, transform: 'translateX(-50%)', fontFamily: MONO, fontSize: 16, color: AMBER, whiteSpace: 'nowrap' }}>
              effective 8 Aug 2026, 00:30 UTC
            </div>
            <div style={{ position: 'absolute', left: `${now * 100}%`, top: 24, width: 16, height: 16, marginLeft: -8, borderRadius: 99, background: TEXT, boxShadow: `0 0 16px ${YT}` }} />
            <div style={{ position: 'absolute', left: 0, top: -6, fontFamily: MONO, fontSize: 20, color: now < 0.5 ? TEXT : FAINT }}>multiplier 1.0026642</div>
            <div style={{ position: 'absolute', right: 0, top: -6, fontFamily: MONO, fontSize: 20, color: now >= 0.5 ? YT : FAINT }}>new_multiplier 1.0032690</div>
          </div>
        </Card>
      </Split>
    </>
  )
}

/* =================================================================== T04 == */

const T04: React.FC = () => {
  const f = useCurrentFrame()
  const tRises = cue(4, 'rises')
  const tCredits = cue(4, 'difference')
  const tNever = cue(4, 'never')
  const split = easeInOut(interpolate(f, [tCredits - 4, tCredits + 20], [0, 1], CLAMP))
  const BAR = 980
  const sliver = 76 * split
  return (
    <>
      <Backdrop glow="left" />
      <Split step={4} eyebrow="sync_multiplier" lines={['Exactly', { em: 'the difference.' }]}>
        <Code
          file="programs/stripr/src/state.rs"
          start={100}
          delay={tRises - 10}
          mark={{ line: 101, at: tCredits - 6 }}
          lines={[
            'if current > self.multiplier {',
            '    let freed = Self::reserved_raw(self.total_stripped, self.multiplier)?',
            '        .checked_sub(Self::reserved_raw(self.total_stripped, current)?)',
            '        .ok_or(StriprError::MathOverflow)?;',
            '    self.multiplier = current;',
          ]}
        />
        <div style={{ height: 26 }} />
        <Rise delay={tRises + 20} distance={10}>
          <div style={{ display: 'flex', height: 58, width: BAR, borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${LINE_2}` }}>
            <div style={{ width: BAR - sliver, background: `linear-gradient(90deg, ${PT_TINT}, rgba(125,211,252,0.28))`, display: 'flex', alignItems: 'center', paddingLeft: 22, fontFamily: MONO, fontSize: 19, color: PT }}>
              99.9397 raw back 100.2664 shares
            </div>
            <div style={{ width: sliver, background: YT, boxShadow: `0 0 30px ${YT}` }} />
          </div>
        </Rise>
        <div style={{ height: 18 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Chip tone="yt" delay={tCredits + 8} mono dot>0.0603 raw → locked YT, rounded down</Chip>
          <Chip tone="amber" delay={tNever} mono>multiplier only ratchets up</Chip>
        </div>
        <Rise delay={tCredits + 16} distance={6}>
          <div style={{ fontFamily: MONO, fontSize: 15, color: FAINT, marginTop: 14 }}>per 100 raw at AAPLx's 8 Aug step · with nothing locked it waits as pending · surplus drawn wider than scale</div>
        </Rise>
      </Split>
    </>
  )
}

/* =================================================================== T05 == */

const T05: React.FC = () => {
  const f = useCurrentFrame()
  const tAcc = cue(5, 'accumulator')
  const tDiv = cue(5, 'division')
  const tHowever = cue(5, 'however')
  const tSettles = cue(5, 'settles')
  const bar = (at: number) => easeOut(interpolate(f, [at, at + 18], [0, 1], CLAMP))
  return (
    <>
      <Backdrop glow="right" />
      <Split step={5} eyebrow="O(1) payouts" lines={['One division,', { em: 'any number of holders.' }]}>
        <Code
          file="programs/stripr/src/state.rs"
          start={52}
          delay={tAcc - 10}
          mark={{ line: 55, at: tDiv }}
          lines={[
            'let delta = (amount as u128)',
            '    .checked_mul(ACC_PRECISION)',
            '    .ok_or(StriprError::MathOverflow)?',
            '    / self.total_yt_locked as u128;',
          ]}
        />
        <div style={{ height: 26 }} />
        <Card delay={tHowever - 8} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>COMPUTE PER PAYOUT · CASH AND STOCK INDEXES</div>
          <div style={{ height: 16 }} />
          {[['10 holders with YT locked', tHowever], ['10,000 holders with YT locked', tHowever + 14]].map(([l, at]) => (
            <div key={l as string} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: SANS, fontSize: 21, color: SOFT, marginBottom: 8 }}>{l}</div>
              <div style={{ height: 14, width: `${60 * bar(at as number)}%`, borderRadius: 7, background: BLUE }} />
            </div>
          ))}
          <div style={{ height: 8 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            {['lock', 'unlock', 'claim'].map((w, i) => (
              <Chip key={w} tone="plain" mono size={18} delay={tSettles + i * 4}>{w} → settle</Chip>
            ))}
          </div>
        </Card>
      </Split>
    </>
  )
}

/* =================================================================== T06 == */

const T06: React.FC = () => {
  const tAccrual = cue(6, 'accrual')
  const tDebt = cue(6, 'debt')
  const tTwo = cue(6, 'two')
  const tAsserts = cue(6, 'asserts')
  return (
    <>
      <Backdrop glow="left" />
      <Split step={6} eyebrow="Solvent by rounding" lines={['Rounding', { em: 'favours the vault.' }]}>
        <div style={{ display: 'flex', gap: 18 }}>
          {[
            ['accrue · state.rs:155', '/ ACC_PRECISION;', 'rounds down ↓', YT, tAccrual],
            ['debt_for · state.rs:171', '.div_ceil(ACC_PRECISION))', 'rounds up ↑', AMBER, tDebt],
          ].map(([file, code, dir, c, at]) => (
            <Card key={file as string} delay={(at as number) - 4} pad={26} style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 16, color: FAINT }}>{file}</div>
              <div style={{ fontFamily: MONO, fontSize: 24, color: TEXT, margin: '14px 0' }}>{code}</div>
              <div style={{ fontFamily: SANS, fontSize: 22, color: c as string }}>{dir}</div>
            </Card>
          ))}
        </div>
        <div style={{ height: 24 }} />
        <Card delay={tTwo - 10} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, color: SOFT }}>#[test] rounding_never_pays_out_more_than_deposited</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, margin: '14px 0 6px' }}>
            <span style={{ fontFamily: SERIF, fontSize: 88, color: TEXT, lineHeight: 1 }}>
              <Count from={0} to={200} start={tTwo} dur={34} fmt={(n) => String(Math.round(n))} />
            </span>
            <span style={{ fontFamily: SANS, fontSize: 22, color: SOFT }}>rounds of uneven payouts, locks and unlocks</span>
          </div>
          <Rise delay={tAsserts} distance={8}>
            <div style={{ fontFamily: MONO, fontSize: 22, color: TEXT, background: YT_TINT, border: `1px solid ${YT}44`, borderRadius: 10, padding: '12px 18px', marginTop: 10 }}>
              assert!(claimed &lt;= deposited); <span style={{ color: YT }}>✓ passes</span>
            </div>
          </Rise>
        </Card>
      </Split>
    </>
  )
}

/* =================================================================== T07 == */

const T07: React.FC = () => {
  const tEscrow = cue(7, 'escrow')
  const tFill = cue(7, 'fill')
  const tSold = cue(7, 'sold-out')
  return (
    <>
      <Backdrop glow="right" />
      <Split step={7} eyebrow="Order book" lines={['The price', { em: 'the buyer saw.' }]}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Box title="Seller" sub="lists PT or YT" delay={tEscrow - 8} w={250} />
          <Rise delay={tEscrow} distance={6}><span style={{ fontFamily: MONO, fontSize: 30, color: FAINT }}>→</span></Rise>
          <Box title="Offer escrow" sub={'["offer_escrow", offer]'} delay={tEscrow} tone={`${YT}77`} w={330} />
          <Rise delay={tFill} distance={6}><span style={{ fontFamily: MONO, fontSize: 30, color: FAINT }}>←</span></Rise>
          <Box title="Buyer" sub="fill_offer" delay={tFill} w={230} />
        </div>
        <div style={{ height: 28 }} />
        <Code
          file="programs/stripr/src/instructions/fill_offer.rs"
          start={75}
          delay={tFill - 4}
          mark={{ line: 76, at: tFill + 20 }}
          lines={['require!(', '    accounts.offer.price == expected_price,', '    StriprError::OfferPriceChanged', ');']}
        />
        <div style={{ height: 22 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Chip tone="plain" mono delay={tFill + 24}>test: rejects a fill at a price the buyer didn't expect ✓</Chip>
        </div>
        <div style={{ height: 14 }} />
        <Chip tone="yt" delay={tSold} dot>Sold out → closes, rent refunded to the seller</Chip>
      </Split>
    </>
  )
}

/* =================================================================== T08 == */

const EXTENSIONS = ['MetadataPointer', 'PermanentDelegate', 'DefaultAccountState', 'ScaledUiAmountConfig', 'PausableConfig', 'ConfidentialTransferMint', 'TransferHook', 'TokenMetadata']

const T08: React.FC = () => {
  const tTransfer = cue(8, 'transfer')
  const tCopy = cue(8, 'copy')
  const tPaus = cue(8, 'pausable')
  return (
    <>
      <Backdrop glow="left" />
      <Split step={8} eyebrow="Token-2022" lines={['Built for', { em: 'the real mint.' }]}>
        <Card delay={tTransfer - 8} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>TOKEN MOVEMENT</div>
          <div style={{ height: 12 }} />
          <div style={{ fontFamily: MONO, fontSize: 24, color: TEXT }}>
            transfer_checked <span style={{ color: SOFT }}>in all 10 instructions that move tokens</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 19, color: FAINT, marginTop: 6 }}>no unchecked transfer() anywhere in the program</div>
        </Card>
        <div style={{ height: 22 }} />
        <Card delay={tCopy - 8} pad={30}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>AAPLX MINT · EXTENSIONS, READ FROM MAINNET</div>
          <div style={{ height: 16 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {EXTENSIONS.map((e, i) => (
              <Chip key={e} tone={e === 'ScaledUiAmountConfig' ? 'yt' : e === 'PausableConfig' ? 'amber' : 'plain'} mono size={18} delay={tCopy + i * 2}>{e}</Chip>
            ))}
          </div>
        </Card>
        <div style={{ height: 22 }} />
        <Rise delay={tCopy + 16} distance={8}>
          <div style={{ fontFamily: MONO, fontSize: 19, color: SOFT, lineHeight: 1.8 }}>
            <span style={{ color: YT }}>✔</span> opens a market with Token-2022 vaults sized for the mint's extensions
          </div>
        </Rise>
        <Rise delay={tPaus} distance={8}>
          <div style={{ fontFamily: MONO, fontSize: 19, color: SOFT, lineHeight: 1.8 }}>
            <span style={{ color: YT }}>✔</span> rejects stripping while the issuer has the stock paused
          </div>
        </Rise>
      </Split>
    </>
  )
}

/* =================================================================== T09 == */

const TESTS = [
  "opens a market with Token-2022 vaults sized for the mint's extensions",
  'lists YT for sale with the tokens held in escrow',
  "only lists this market's PT or YT",
  'fills part of an offer, paying the seller at the listed price',
  "rejects a fill at a price the buyer didn't expect",
  'rejects buying more than is left',
  'closes a sold-out offer and refunds its rent to the seller',
  'lets the buyer lock bought YT and earn the next dividend',
  'lets only the maker cancel, returning unsold tokens',
  'initializes a market',
  'strips stock into PT and YT 1:1',
  'rejects dividends from anyone but the admin',
  'splits dividends pro-rata across locked YT',
  'redeems PT + YT back into the stock',
  "opens a market and strips at the stock's current multiplier",
  'pays a cash dividend to locked YT',
  'pays locked YT in the stock when the issuer raises the multiplier',
  'rejects stripping while the issuer has the stock paused',
  'redeems the principal at the new multiplier without over-paying',
]

const T09: React.FC = () => {
  const f = useCurrentFrame()
  const tNineteen = cue(9, 'nineteen')
  const tEight = cue(9, 'eight')
  const tByte = cue(9, 'byte')
  // The run scrolls past as it did in the terminal, one line every two frames.
  const shown = Math.max(0, Math.min(TESTS.length, Math.floor((f - (tNineteen - 30)) / 2)))
  const ROW = 30
  const scroll = Math.max(0, shown - 9) * ROW
  return (
    <>
      <Backdrop glow="right" />
      <Split step={9} eyebrow="Proof" lines={['19 passing.', { em: 'Byte-identical.' }]}>
        <Card delay={tNineteen - 34} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 24px', borderBottom: `1.5px solid ${LINE}`, background: '#0C1016', fontFamily: MONO, fontSize: 17, color: SOFT }}>
            $ npm run test:program
          </div>
          <div style={{ height: ROW * 9 + 12, overflow: 'hidden', padding: '8px 24px' }}>
            <div style={{ transform: `translateY(${-scroll}px)` }}>
              {TESTS.slice(0, shown).map((t) => (
                <div key={t} style={{ fontFamily: MONO, fontSize: 17, lineHeight: `${ROW}px`, color: SOFT, whiteSpace: 'nowrap' }}>
                  <span style={{ color: YT }}>✔</span> {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 24px 16px', fontFamily: MONO, fontSize: 20, color: shown >= TESTS.length ? YT : FAINT }}>
            {shown >= TESTS.length ? '19 passing' : `${shown} passing…`}
            <span style={{ color: FAINT, marginLeft: 24, opacity: f >= tEight ? 1 : 0 }}>cargo test -p stripr · 8 passed</span>
          </div>
        </Card>
        <div style={{ height: 22 }} />
        <Card delay={tByte - 8} pad={28} style={{ borderColor: `${YT}55` }}>
          <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '0.12em', color: FAINT }}>SHA-256 OF THE PROGRAM</div>
          <div style={{ height: 12 }} />
          {[['mainnet 9wpHm…nzZF', tByte], ['local build', tByte + 8]].map(([l, at]) => (
            <Rise key={l as string} delay={at as number} distance={6}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 21, padding: '6px 0' }}>
                <span style={{ color: SOFT }}>{l}</span>
                <span style={{ color: TEXT }}>2a6f8da8f52c53d1…</span>
              </div>
            </Rise>
          ))}
          <div style={{ height: 10 }} />
          <Chip tone="yt" delay={tByte + 18} dot>Match</Chip>
        </Card>
      </Split>
    </>
  )
}

/* =================================================================== T10 == */

const T10: React.FC = () => (
  <>
    <Backdrop tone="cover" />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40 }}>
        <Lockup height={140} delay={2} />
        <div style={{ height: 40 }} />
        <Headline lines={[{ em: 'Boring on purpose.' }]} delay={cue(10, 'boring') - 4} size={72} align="center" />
        <div style={{ height: 40 }} />
        <div style={{ display: 'flex', gap: 14 }}>
          <Chip tone="yt" delay={cue(10, 'mit')} size={24} dot>MIT licensed</Chip>
          <Chip tone="plain" delay={cue(10, 'mit') + 5} size={24} mono>github.com/NetLayerLabs/Stripr</Chip>
          <Chip tone="plain" delay={cue(10, 'mit') + 10} size={24} mono>stripr.xyz</Chip>
        </div>
      </div>
    </AbsoluteFill>
  </>
)

/* ================================================================ assembly == */

const BODIES: React.FC[] = [T00, T01, T02, T03, T04, T05, T06, T07, T08, T09, T10]

const Scene: React.FC<{ first: boolean; children: React.ReactNode }> = ({ first, children }) => {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ opacity: first ? 1 : interpolate(f, [0, FADE], [0, 1], CLAMP) }}>{children}</AbsoluteFill>
}

export const StriprTech: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    {BODIES.map((B, i) => (
      <Sequence key={IDS[i]} from={STARTS[i]} durationInFrames={DURS[i] + (i === BODIES.length - 1 ? 0 : FADE)} name={IDS[i]} premountFor={30}>
        <Scene first={i === 0}>
          <B />
        </Scene>
        <Sequence from={LEAD} layout="none">
          <Audio src={staticFile(`vo-tech/${IDS[i]}.mp3`)} volume={1.6} />
        </Sequence>
      </Sequence>
    ))}
    <ProgressRail total={TECH_DURATION} />
  </AbsoluteFill>
)
