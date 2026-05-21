import { SpeedArithmeticDrill } from '@/components/interactive/SpeedDrill';

export default function SpeedDrillPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Speed Arithmetic Drill
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Timed mental math practice at three difficulty levels to build speed
          for options trading.
        </p>
      </div>
      <SpeedArithmeticDrill />
    </div>
  );
}
