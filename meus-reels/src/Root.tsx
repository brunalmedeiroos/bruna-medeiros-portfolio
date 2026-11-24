import { Composition } from "remotion";
import { Reel, reelSchemaDefaults } from "./Reel";
import { EstiloA, EstiloB, EstiloC } from "./Estilos";
import { Reel01, REEL01_FRAMES, reel01Defaults } from "./Reel01";
import { Reel02, REEL02_FRAMES, reel02Defaults } from "./Reel02";
import { GANCHO_1, GANCHO_2, GANCHO_2_NOVO, Reel03 } from "./Reel03";
import { Reel04, REEL04_FRAMES, reel04Defaults } from "./Reel04";
import { Reel05, REEL05_FRAMES, reel05Defaults } from "./Reel05";
import { Reel06, REEL06_FRAMES, reel06Defaults } from "./Reel06";
import { Reel07, REEL07_FRAMES, reel07Defaults } from "./Reel07";
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
        id="Reel03G1"
        component={Reel03}
        durationInFrames={Math.round(GANCHO_1.duracao * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ gancho: GANCHO_1, showSafeArea: false }}
      />
      <Composition
        id="Reel03G2"
        component={Reel03}
        durationInFrames={Math.round(GANCHO_2.duracao * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ gancho: GANCHO_2, showSafeArea: false }}
      />
      <Composition
        id="Reel03G2Novo"
        component={Reel03}
        durationInFrames={Math.round(GANCHO_2_NOVO.duracao * FPS)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ gancho: GANCHO_2_NOVO, showSafeArea: false }}
      />
      <Composition
        id="Reel04"
        component={Reel04}
        durationInFrames={REEL04_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel04Defaults}
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
      <Composition
        id="Reel05"
        component={Reel05}
        durationInFrames={REEL05_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel05Defaults}
      />
      <Composition
        id="Reel06"
        component={Reel06}
        durationInFrames={REEL06_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel06Defaults}
      />
      <Composition
        id="Reel07"
        component={Reel07}
        durationInFrames={REEL07_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={reel07Defaults}
      />
    </>
  );
};
