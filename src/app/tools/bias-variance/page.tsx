import { BiasVarianceExplorer } from '@/components/interactive/BiasVarianceExplorer';

export default function BiasVariancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bias-Variance Explorer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualize the bias-variance tradeoff with interactive polynomial fitting on noisy data.
        </p>
      </div>
      <BiasVarianceExplorer />
    </div>
  );
}
