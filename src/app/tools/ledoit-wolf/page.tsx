import { LedoitWolfShrinkage } from '@/components/interactive/LedoitWolfShrinkage';

export default function LedoitWolfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Ledoit-Wolf Covariance Shrinkage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare sample vs shrunk covariance matrices and see how shrinkage improves conditioning.
        </p>
      </div>
      <LedoitWolfShrinkage />
    </div>
  );
}
