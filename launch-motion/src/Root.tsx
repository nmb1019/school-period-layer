import {Composition} from 'remotion';
import {
  SchoolPeriodPromo,
  VIDEO_DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './SchoolPeriodPromo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="SchoolPeriodPromo"
      component={SchoolPeriodPromo}
      durationInFrames={VIDEO_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};
