import React from 'react'
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useVideoConfig } from 'remotion'
import media from './media.json'
import { Backdrop, Caption, Cover, Outro, Screen, Title } from './ui'

type Section = {
  vo: string
  clip?: string
  /** Seconds into the clip this section starts, for two sections sharing one recording. */
  from?: number
  kicker?: string
  text?: string
  card?: 'title' | 'outro'
  zoom?: number
  pan?: [number, number]
}

/**
 * One entry per narration file. The clip named here is the recording of the real app
 * that the line is describing; where a line has no clip it plays over a card instead.
 */
export const SECTIONS: Section[] = [
  { vo: 'v00', card: 'title' },
  { vo: 'v01', clip: 'landing', kicker: 'The problem', text: 'A share pays a price and a dividend. Today you cannot sell one without the other.' },
  { vo: 'v02', clip: 'ledger', kicker: 'The mechanism', text: 'xStocks pay by raising a multiplier. Every balance grows, and nobody can trade that yield on its own.', zoom: 1.04 },
  { vo: 'v03', clip: 'anatomy', kicker: 'The split', text: 'PT is the claim on the share. YT collects every dividend it will ever pay.' },
  { vo: 'v04', clip: 'markets', from: 14, kicker: 'Live on mainnet', text: 'Fifteen markets, one for each xStock, every figure read from the chain.' },
  { vo: 'v05', clip: 'strip', from: 52, kicker: 'Strip', text: 'Deposit the stock, mint equal PT and YT, and lock the YT in one transaction.', zoom: 1.05, pan: [0, -26] },
  { vo: 'v06', clip: 'position', from: 15, kicker: 'Earn', text: 'When the multiplier rises, the surplus goes to locked YT. No oracle, no admin key.' },
  { vo: 'v07', clip: 'book', from: 15, kicker: 'Trade', text: 'List future dividends for USDC. The tokens sit in an escrow the program owns.' },
  { vo: 'v08', clip: 'book', from: 23, kicker: 'Priced, not guessed', text: 'A measured 1.68% a year makes a YT at 8.78 USDC a 28% yield that repays in 3.6 years.', zoom: 1.06 },
  { vo: 'v09', clip: 'analytics', kicker: 'Verifiable', text: 'Every chart is rebuilt from the market’s own on-chain events.' },
  { vo: 'v10', clip: 'architecture', from: 11, kicker: 'Under the hood', text: 'One Anchor program. O(1) payouts, solvent by rounding, nineteen end-to-end tests.' },
  { vo: 'v11', card: 'outro' },
]

const PAD = 0.45 // seconds of air after each line

export const sectionFrames = (fps: number) =>
  SECTIONS.map((s) => {
    const vo = (media.vo as Record<string, { duration: number }>)[s.vo]
    return Math.round(((vo?.duration ?? 4) + PAD) * fps)
  })

export const totalFrames = (fps: number) => sectionFrames(fps).reduce((a, b) => a + b, 0)

export const Stripr: React.FC = () => {
  const { fps } = useVideoConfig()
  const lengths = sectionFrames(fps)
  let at = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#06080B' }}>
      <Backdrop />
      {SECTIONS.map((s, i) => {
        const from = at
        const durationInFrames = lengths[i]
        at += durationInFrames
        const clip = s.clip ? (media.clips as Record<string, { file: string; duration: number }>)[s.clip] : undefined
        const seconds = durationInFrames / fps
        // Stretch or compress the recording so it fills the line exactly, rather than
        // freezing on a last frame or cutting away mid-gesture.
        const available = clip ? Math.max(0.5, clip.duration - (s.from ?? 0) - 0.5) : 0
        const rate = clip ? Math.min(3.2, Math.max(0.5, available / seconds)) : 1

        return (
          <Sequence
            key={s.vo}
            from={from}
            durationInFrames={durationInFrames}
            premountFor={clip ? 24 : 0}
            name={`${s.vo} ${s.clip ?? s.card}`}
          >
            <Audio src={staticFile((media.vo as Record<string, { file: string }>)[s.vo].file)} />
            {s.card === 'title' ? <Title /> : null}
            {s.card === 'outro' ? <Outro /> : null}
            {clip ? (
              <>
                <Screen zoom={s.zoom} pan={s.pan}>
                  <OffthreadVideo
                    src={staticFile(clip.file)}
                    startFrom={Math.round((s.from ?? 0) * fps)}
                    playbackRate={rate}
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Cover />
                </Screen>
                {s.text ? <Caption kicker={s.kicker} text={s.text} /> : null}
              </>
            ) : null}
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
