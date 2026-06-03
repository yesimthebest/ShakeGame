type ResultScreenProps = {
  score: number;
  onRestart: () => void;
};

export default function ResultScreen({ score, onRestart }: ResultScreenProps) {
  return (
    <div className="result-screen">
      <h2>Final Score</h2>
      <p>{score}</p>
      <button type="button" onClick={onRestart}>
        Restart
      </button>
    </div>
  );
}
