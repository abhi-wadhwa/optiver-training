import { BSCalculator } from '@/components/interactive/BSCalculator';

export default function BSCalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Black-Scholes Calculator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust the parameters to see real-time option prices and Greeks.
        </p>
      </div>
      <BSCalculator />
    </div>
  );
}
