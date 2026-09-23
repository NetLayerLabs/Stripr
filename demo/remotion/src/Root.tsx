import React from 'react'
import { Composition } from 'remotion'
import { FPS, STRIPR_DURATION, Stripr } from './Stripr'

export const RemotionRoot: React.FC = () => (
  <Composition id="Stripr" component={Stripr} durationInFrames={STRIPR_DURATION} fps={FPS} width={1920} height={1080} />
)
