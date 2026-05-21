import { PCAVolDecomposition } from '@/components/interactive/PCAVolDecomposition';

export default function PCAVolDecompositionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          PCA Vol Surface Decomposition
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decompose an implied volatility surface into principal components and explore level, slope, and curvature modes.
        </p>
      </div>
      <PCAVolDecomposition />
    </div>
  );
}
