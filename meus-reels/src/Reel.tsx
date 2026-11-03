import { AbsoluteFill } from "remotion";
import { SAFE_AREA } from "./config";

export const reelSchemaDefaults = {
  // Ligue para ver a área segura do Instagram durante a edição (nunca sai no MP4 final).
  showSafeArea: true,
};

type Props = typeof reelSchemaDefaults;

export const Reel: React.FC<Props> = ({ showSafeArea }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f4efe9" }}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
          fontSize: 64,
          color: "#33262a",
        }}
      >
        Projeto pronto
      </AbsoluteFill>
      {showSafeArea ? (
        <div
          style={{
            position: "absolute",
            top: SAFE_AREA.top,
            bottom: SAFE_AREA.bottom,
            left: SAFE_AREA.sides,
            right: SAFE_AREA.sides,
            border: "3px dashed rgba(255,0,80,0.7)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
