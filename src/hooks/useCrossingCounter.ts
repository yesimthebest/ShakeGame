import { useEffect, useRef, useState } from "react";
import { WristDot } from "./usePoseLandmarker";

const DEAD_ZONE = 0.025;
const ARM_THRESHOLD = 0.045;
const MAX_Y_DIFFERENCE = 0.35;

export type WristZone =
  | "LEFT_ON_LEFT"
  | "LEFT_ON_RIGHT"
  | "CENTER"
  | "TRANSITION"
  | "UNKNOWN";

type ArmedSide = "LEFT_ON_LEFT" | "LEFT_ON_RIGHT";

export type CrossingDebugInfo = {
  diff: number | null;
  currentZone: WristZone;
  armedSide: ArmedSide | "UNKNOWN";
  score: number;
};

function getWristSnapshot(wristDots: WristDot[]) {
  const leftWrist = wristDots.find((dot) => dot.name === "leftWrist");
  const rightWrist = wristDots.find((dot) => dot.name === "rightWrist");

  if (!leftWrist || !rightWrist) {
    return { currentZone: "UNKNOWN" as const, diff: null };
  }

  const diff = leftWrist.normalizedX - rightWrist.normalizedX;
  const yDifference = Math.abs(leftWrist.normalizedY - rightWrist.normalizedY);

  if (yDifference > MAX_Y_DIFFERENCE) {
    return { currentZone: "UNKNOWN" as const, diff };
  }

  if (diff < -ARM_THRESHOLD) {
    return { currentZone: "LEFT_ON_LEFT" as const, diff };
  }

  if (diff > ARM_THRESHOLD) {
    return { currentZone: "LEFT_ON_RIGHT" as const, diff };
  }

  if (diff >= -DEAD_ZONE && diff <= DEAD_ZONE) {
    return { currentZone: "CENTER" as const, diff };
  }

  return { currentZone: "TRANSITION" as const, diff };
}

export function useCrossingCounter(
  wristDots: WristDot[],
  isEnabled: boolean,
  resetKey: number,
) {
  const armedSideRef = useRef<ArmedSide | "UNKNOWN">("UNKNOWN");
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [debugInfo, setDebugInfo] = useState<CrossingDebugInfo>({
    diff: null,
    currentZone: "UNKNOWN",
    armedSide: "UNKNOWN",
    score: 0,
  });

  useEffect(() => {
    armedSideRef.current = "UNKNOWN";
    scoreRef.current = 0;
    setScore(0);
    setDebugInfo({
      diff: null,
      currentZone: "UNKNOWN",
      armedSide: "UNKNOWN",
      score: 0,
    });
  }, [resetKey]);

  useEffect(() => {
    const { currentZone, diff } = getWristSnapshot(wristDots);
    const armedSide = armedSideRef.current;

    if (
      isEnabled &&
      (currentZone === "LEFT_ON_LEFT" || currentZone === "LEFT_ON_RIGHT")
    ) {
      if (armedSide !== "UNKNOWN" && armedSide !== currentZone) {
        const nextScore = scoreRef.current + 1;
        scoreRef.current = nextScore;
        setScore(nextScore);
      }

      armedSideRef.current = currentZone;
    }

    setDebugInfo({
      diff,
      currentZone,
      armedSide: armedSideRef.current,
      score: scoreRef.current,
    });
  }, [isEnabled, wristDots]);

  return { score, debugInfo };
}
