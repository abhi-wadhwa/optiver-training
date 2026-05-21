import { LOBOrderFlow } from '@/components/interactive/LOBOrderFlow';

export default function LOBOrderFlowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Limit Order Book Simulator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch an animated order book with real-time order flow imbalance, micro-price, and trade tape.
        </p>
      </div>
      <LOBOrderFlow />
    </div>
  );
}
