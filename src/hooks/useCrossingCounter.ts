import { useEffect, useRef, useState } from "react";
import { WristDot } from "./usePoseLandmarker";

const APART_THRESHOLD = 0.075;
const NEAR_THRESHOLD = 0.06;

export type CrossingPhase = "APART" | "NEAR" | "BETWEEN" | "UNKNOWN";

export type CrossingDebugInfo = {
  distanceX: number | null;
  currentPhase: CrossingPhase;
  crossingCandidate: boolean;
  score: number;
};

function getWristSnapshot(wristDots: WristDot[]) {
  const leftWrist = wristDots.find((dot) => dot.name === "leftWrist");
  const rightWrist = wristDots.find((dot) => dot.name === "rightWrist");

  if (!leftWrist || !rightWrist) {
    return {
      currentPhase: "UNKNOWN" as const,
      distanceX: null,
    };
  }

  const distanceX = Math.abs(leftWrist.normalizedX - rightWrist.normalizedX);

  if (distanceX > APART_THRESHOLD) {
    return { currentPhase: "APART" as const, distanceX };
  }

  if (distanceX < NEAR_THRESHOLD) {
    return { currentPhase: "NEAR" as const, distanceX };
  }

  return { currentPhase: "BETWEEN" as const, distanceX };
}

export function useCrossingCounter(
  wristDots: WristDot[],
  isEnabled: boolean,
  resetKey: number,
) {
  const hasBeenApartRef = useRef(false);
  const crossingCandidateRef = useRef(false);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [debugInfo, setDebugInfo] = useState<CrossingDebugInfo>({
    distanceX: null,
    currentPhase: "UNKNOWN",
    crossingCandidate: false,
    score: 0,
  });

  useEffect(() => {
    hasBeenApartRef.current = false;
    crossingCandidateRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setDebugInfo({
      distanceX: null,
      currentPhase: "UNKNOWN",
      crossingCandidate: false,
      score: 0,
    });
  }, [resetKey]);

  useEffect(() => {
    const { currentPhase, distanceX } = getWristSnapshot(wristDots);

    if (isEnabled) {
      if (currentPhase === "APART") {
        hasBeenApartRef.current = true;
        crossingCandidateRef.current = true;
      }

      if (
        currentPhase === "NEAR" &&
        hasBeenApartRef.current &&
        crossingCandidateRef.current
      ) {
          const nextScore = scoreRef.current + 1;
          scoreRef.current = nextScore;
          setScore(nextScore);
        crossingCandidateRef.current = false;
      }
    }

    setDebugInfo({
      distanceX,
      currentPhase,
      crossingCandidate: crossingCandidateRef.current,
      score: scoreRef.current,
    });
  }, [isEnabled, wristDots]);

  return { score, debugInfo };
}
