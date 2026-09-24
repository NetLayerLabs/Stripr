import React from 'react'
import { AbsoluteFill } from 'remotion'
import { Backdrop, Chip, FAINT, Headline, Lockup, MONO, PT, PT_TINT, SANS, SERIF, SOFT, TEXT, TokenLogo, YT, YT_TINT, cardStyle } from './ui'

/**
 * The social preview (1200x630): what unfurls when stripr.xyz is shared. Rendered as a
 * still from the same design system as the film, so the two never drift apart.
 */
const Token: React.FC<{ tone: 'pt' | 'yt'; name: string; line: string; x: number; y: number }> = ({ tone, name, line, x, y }) => {
  const c = tone === 'pt' ? PT : YT
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 330, ...cardStyle, padding: 24, borderColor: `${c}55`, boxShadow: `${cardStyle.boxShadow}, 0 0 70px -30px ${c}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 46, height: 46, borderRadius: 99, background: tone === 'pt' ? PT_TINT : YT_TINT, border: `1.5px solid ${c}66`, display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 17, color: c }}>
          {tone.toUpperCase()}
        </span>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 27, color: TEXT }}>{tone.toUpperCase()}-AAPLx</div>
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: c }}>{name}</div>
        </div>
      </div>
      <div style={{ height: 14 }} />
      <div style={{ fontFamily: SANS, fontSize: 19, color: SOFT, lineHeight: 1.35 }}>{line}</div>
    </div>
  )
}

export const OG: React.FC = () => (
  <AbsoluteFill>
    <Backdrop glow="right" />
    <div style={{ position: 'absolute', left: 70, top: 58 }}>
      <Lockup height={58} delay={-60} />
    </div>
    <div style={{ position: 'absolute', left: 70, top: 168, width: 640 }}>
      <Headline lines={['Split a stock into', 'its principal and', { em: 'its yield.' }]} delay={-60} size={66} />
    </div>
    <div style={{ position: 'absolute', left: 70, bottom: 58, display: 'flex', gap: 12 }}>
      <Chip tone="yt" dot delay={-60} size={19}>Live on Solana mainnet</Chip>
      <Chip tone="plain" delay={-60} size={19}>15 xStocks markets</Chip>
    </div>

    {/* The share, and the two tokens it becomes. */}
    <div style={{ position: 'absolute', left: 770, top: 92, width: 360, ...cardStyle, padding: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
      <TokenLogo sym="AAPLx" size={52} />
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 30, color: TEXT }}>1 AAPLx</div>
        <div style={{ fontFamily: SANS, fontSize: 17, color: FAINT }}>one tokenized share</div>
      </div>
    </div>
    <svg width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d="M 950 190 C 950 230, 880 230, 880 262" fill="none" stroke={PT} strokeWidth={2} opacity={0.7} />
      <path d="M 950 190 C 950 230, 1010 230, 1010 350" fill="none" stroke={YT} strokeWidth={2} opacity={0.7} />
    </svg>
    <Token tone="pt" name="Principal token" line="The claim on the stock." x={712} y={262} />
    <Token tone="yt" name="Yield token" line="Every dividend it pays." x={842} y={402} />
    <div style={{ position: 'absolute', right: 70, bottom: 58, fontFamily: MONO, fontSize: 21, color: SOFT, letterSpacing: '0.04em' }}>stripr.xyz</div>
  </AbsoluteFill>
)
