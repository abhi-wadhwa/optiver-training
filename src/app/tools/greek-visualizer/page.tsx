import { GreekVisualizer } from '@/components/interactive/GreekVisualizer';

export default function GreekVisualizerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Greek Visualizer
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plot option Greeks against different variables and overlay multiple
          positions.
        </p>
      </div>
      <GreekVisualizer />
    </div>
  );
}
