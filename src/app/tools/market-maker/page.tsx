import { MarketMakingSim } from '@/components/interactive/MarketMakingSim';

export default function MarketMakerPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="mb-2 text-2xl font-bold">Market Making Simulator</h1>
      <p className="mb-6 text-muted-foreground">
        Practice quoting bid-ask spreads and managing inventory risk.
      </p>
      <MarketMakingSim />
    </div>
  );
}
