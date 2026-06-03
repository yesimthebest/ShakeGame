type GameHUDProps = {
  timeLeft: number;
};

export default function GameHUD({ timeLeft }: GameHUDProps) {
  return (
    <div className="game-hud">
      <div>Time: {timeLeft}</div>
    </div>
  );
}
