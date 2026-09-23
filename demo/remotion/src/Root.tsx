import React from 'react'
import { Composition } from 'remotion'
import { Stripr, totalFrames } from './Stripr'

const FPS = 30

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Stripr"
    component={Stripr}
    durationInFrames={totalFrames(FPS)}
    fps={FPS}
    width={1920}
    height={1080}
  />
)
