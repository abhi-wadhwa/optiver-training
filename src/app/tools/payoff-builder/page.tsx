import { PayoffDiagramBuilder } from '@/components/interactive/PayoffDiagram';

export default function PayoffBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Payoff Diagram Builder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build multi-leg option strategies and visualize their payoff at
          expiry.
        </p>
      </div>
      <PayoffDiagramBuilder />
    </div>
  );
}
