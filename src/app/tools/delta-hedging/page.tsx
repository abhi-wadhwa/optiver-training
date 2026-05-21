import { DeltaHedgingSim } from '@/components/interactive/DeltaHedgingSim';

export default function DeltaHedgingPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="mb-2 text-2xl font-bold">Delta Hedging Simulator</h1>
      <p className="mb-6 text-muted-foreground">
        Simulate discrete delta hedging and see how hedging frequency affects
        P&L.
      </p>
      <DeltaHedgingSim />
    </div>
  );
}
