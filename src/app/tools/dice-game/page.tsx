import { DiceGameSimulator } from '@/components/interactive/DiceGame';

export default function DiceGamePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dice Game Simulator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore expected value estimation and optimal stopping strategies with
          dice games.
        </p>
      </div>
      <DiceGameSimulator />
    </div>
  );
}
