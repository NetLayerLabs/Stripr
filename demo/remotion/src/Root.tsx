import React from 'react'
import { Composition } from 'remotion'
import { OG } from './OG'
import { FPS, STRIPR_DURATION, Stripr } from './Stripr'
import { StriprTech, TECH_DURATION, TECH_FPS } from './StriprTech'

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Stripr" component={Stripr} durationInFrames={STRIPR_DURATION} fps={FPS} width={1920} height={1080} />
    {/* The technical cut: the same system, cued to its own narration. */}
    <Composition id="StriprTech" component={StriprTech} durationInFrames={TECH_DURATION} fps={TECH_FPS} width={1920} height={1080} />
    {/* The social preview: a still, rendered with `npm run og`. */}
    <Composition id="OG" component={OG} durationInFrames={1} fps={FPS} width={1200} height={630} />
  </>
)
