import { GARCHForecaster } from '@/components/interactive/GARCHForecaster';

export default function GARCHForecasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          GARCH(1,1) Forecaster
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simulate GARCH(1,1) volatility processes and explore multi-step variance forecasts.
        </p>
      </div>
      <GARCHForecaster />
    </div>
  );
}
