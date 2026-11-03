import { Composition } from "remotion";
import { Reel, reelSchemaDefaults } from "./Reel";
import { FPS, HEIGHT, WIDTH } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={FPS * 10}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={reelSchemaDefaults}
    />
  );
};
