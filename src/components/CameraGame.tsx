import { useEffect, useRef, useState } from "react";
import { GameStatus } from "../App";
import GameHUD from "./GameHUD";
import ResultScreen from "./ResultScreen";
import { useCrossingCounter } from "../hooks/useCrossingCounter";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";

type CameraGameProps = {
  gameStatus: Exclude<GameStatus, "idle">;
  countdown: number;
  timeLeft: number;
  score: number;
  gameRound: number;
  onScoreChange: (score: number) => void;
  onRestart: () => void;
};

export default function CameraGame({
  gameStatus,
  countdown,
  timeLeft,
  score,
  gameRound,
  onScoreChange,
  onRestart,
}: CameraGameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const { wristDots, errorMessage: poseErrorMessage } = usePoseLandmarker(
    videoRef,
    isCameraReady && !errorMessage,
  );
  const { score: currentScore, debugInfo } = useCrossingCounter(
    wristDots,
    gameStatus === "playing",
    gameRound,
  );

  useEffect(() => {
    onScoreChange(currentScore);
  }, [currentScore, onScoreChange]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (isMounted) {
          setErrorMessage("웹캠 권한이 거부되었습니다.");
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <section className="camera-game">
      {errorMessage ? (
        <p className="error-message">{errorMessage}</p>
      ) : (
        <>
          <h1 className="play-title">흔들어라</h1>
          <div className="camera-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setIsCameraReady(true)}
            />
            {wristDots.map((dot) => (
              <span
                key={dot.name}
                className="wrist-dot"
                style={{ left: dot.x, top: dot.y }}
              />
            ))}
            {gameStatus === "countdown" ? (
              <div className="countdown-display">{countdown}</div>
            ) : null}
            {gameStatus === "playing" ? (
              <>
                <GameHUD timeLeft={timeLeft} />
                <div className="score-display">
                  <span className="score-label">score</span>
                  <span>{currentScore}</span>
                </div>
              </>
            ) : null}
            {gameStatus === "finished" ? (
              <ResultScreen score={score} onRestart={onRestart} />
            ) : null}
            <div className="debug-panel">
              <div>
                distanceX:{" "}
                {debugInfo.distanceX === null
                  ? "UNKNOWN"
                  : debugInfo.distanceX.toFixed(3)}
              </div>
              <div>currentPhase: {debugInfo.currentPhase}</div>
              <div>
                crossingCandidate:{" "}
                {debugInfo.crossingCandidate ? "true" : "false"}
              </div>
              <div>shakeEnergy: {debugInfo.shakeEnergy.toFixed(3)}</div>
              <div>score: {debugInfo.score}</div>
            </div>
          </div>
          {poseErrorMessage ? (
            <p className="error-message">{poseErrorMessage}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
