import { useEffect, useRef, useState } from "react";
import { WristDot } from "./usePoseLandmarker";

const APART_THRESHOLD = 0.12;
const NEAR_THRESHOLD = 0.09;
const ENERGY_UNIT = 0.095;
const TINY_NOISE = 0.004;
const MAX_ENERGY_POINTS_PER_FRAME = 2;

export type CrossingPhase = "APART" | "NEAR" | "BETWEEN" | "UNKNOWN";

export type CrossingDebugInfo = {
  distanceX: number | null;
  currentPhase: CrossingPhase;
  crossingCandidate: boolean;
  shakeEnergy: number;
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
  const previousDistanceXRef = useRef<number | null>(null);
  const shakeEnergyRef = useRef(0);
  const scoreRef = useRef(0);
  const [score, setScore] = useState(0);
  const [debugInfo, setDebugInfo] = useState<CrossingDebugInfo>({
    distanceX: null,
    currentPhase: "UNKNOWN",
    crossingCandidate: false,
    shakeEnergy: 0,
    score: 0,
  });

  useEffect(() => {
    hasBeenApartRef.current = false;
    crossingCandidateRef.current = false;
    previousDistanceXRef.current = null;
    shakeEnergyRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setDebugInfo({
      distanceX: null,
      currentPhase: "UNKNOWN",
      crossingCandidate: false,
      shakeEnergy: 0,
      score: 0,
    });
  }, [resetKey]);

  useEffect(() => {
    const { currentPhase, distanceX } = getWristSnapshot(wristDots);

    if (isEnabled && distanceX !== null) {
      const previousDistanceX = previousDistanceXRef.current;

      if (previousDistanceX !== null) {
        const distanceChange = Math.abs(distanceX - previousDistanceX);

        if (distanceChange > TINY_NOISE) {
          shakeEnergyRef.current += distanceChange;
        }
      }

      if (currentPhase === "APART") {
        hasBeenApartRef.current = true;

        if (crossingCandidateRef.current) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          crossingCandidateRef.current = false;
        }
      }

      if (currentPhase === "NEAR" && hasBeenApartRef.current) {
        if (!crossingCandidateRef.current) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }

        crossingCandidateRef.current = false;
        crossingCandidateRef.current = true;
      }

      let energyPoints = 0;

      while (
        shakeEnergyRef.current >= ENERGY_UNIT &&
        energyPoints < MAX_ENERGY_POINTS_PER_FRAME
      ) {
        shakeEnergyRef.current -= ENERGY_UNIT;
        energyPoints += 1;
      }

      if (energyPoints > 0) {
        scoreRef.current += energyPoints;
        setScore(scoreRef.current);
      }

      previousDistanceXRef.current = distanceX;
    }

    setDebugInfo({
      distanceX,
      currentPhase,
      crossingCandidate: crossingCandidateRef.current,
      shakeEnergy: shakeEnergyRef.current,
      score: scoreRef.current,
    });
  }, [isEnabled, wristDots]);

  return { score, debugInfo };
}
