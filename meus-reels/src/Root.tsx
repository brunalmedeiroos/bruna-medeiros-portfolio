import { Composition } from "remotion";
import { Reel, reelSchemaDefaults } from "./Reel";
import { EstiloA, EstiloB, EstiloC } from "./Estilos";
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
