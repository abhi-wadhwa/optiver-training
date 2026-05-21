import { PutCallParityCalculator } from '@/components/interactive/PutCallParity';

export default function PutCallParityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Put-Call Parity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculator and speed drill for put-call parity. Detect violations and
          practice solving for unknowns.
        </p>
      </div>
      <PutCallParityCalculator />
    </div>
  );
}
