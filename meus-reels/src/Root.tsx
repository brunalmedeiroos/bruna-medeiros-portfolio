import { Composition } from "remotion";
import { Reel, reelSchemaDefaults } from "./Reel";
import { EstiloA, EstiloB, EstiloC } from "./Estilos";
import { Reel01, REEL01_FRAMES, reel01Defaults } from "./Reel01";
import { Reel02, REEL02_FRAMES, reel02Defaults } from "./Reel02";
import { FPS, HEIGHT, WIDTH } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {(["A", "B", "C"] as const).map((k) => (
        <Composition
          key={k}
          id={`Estilo${k}`}
          component={{ A: EstiloA, B: EstiloB, C: EstiloC }[k]}
          durationInFrames={FPS * 5}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
      <Composition
        id="Reel01"
        component={Reel01}
        durationInFrames={REEL01_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel01Defaults}
      />
      <Composition
        id="Reel02"
        component={Reel02}
        durationInFrames={REEL02_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel02Defaults}
      />
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={FPS * 10}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reelSchemaDefaults}
      />
    </>
  );
};
