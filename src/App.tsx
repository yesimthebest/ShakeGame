import { useEffect, useState } from "react";
import CameraGame from "./components/CameraGame";

export type GameStatus = "idle" | "countdown" | "playing" | "finished";

export default function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [gameRound, setGameRound] = useState(0);

  function startCountdown() {
    setScore(0);
    setTimeLeft(10);
    setCountdown(3);
    setGameRound((currentRound) => currentRound + 1);
    setGameStatus("countdown");
  }

  useEffect(() => {
    if (gameStatus !== "countdown") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (countdown > 1) {
        setCountdown((currentCountdown) => currentCountdown - 1);
      } else {
        setTimeLeft(10);
        setGameStatus("playing");
      }
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [countdown, gameStatus]);

  useEffect(() => {
    if (gameStatus !== "playing") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeft((currentTimeLeft) => {
        if (currentTimeLeft <= 1) {
          setGameStatus("finished");
          return 0;
        }

        return currentTimeLeft - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [gameStatus, timeLeft]);

  return (
    <main className="app">
      {gameStatus === "idle" ? (
        <>
          <h1>흔들기 게임</h1>
          <button type="button" onClick={startCountdown}>
            Start
          </button>
        </>
      ) : (
        <CameraGame
          gameStatus={gameStatus}
          countdown={countdown}
          timeLeft={timeLeft}
          score={score}
          gameRound={gameRound}
          onScoreChange={setScore}
          onRestart={startCountdown}
        />
      )}
    </main>
  );
}
