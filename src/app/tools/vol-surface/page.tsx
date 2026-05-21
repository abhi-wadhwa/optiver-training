import { VolSurfaceViewer } from '@/components/interactive/VolSurfaceViewer';

export default function VolSurfacePage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="mb-2 text-2xl font-bold">Volatility Surface Viewer</h1>
      <p className="mb-6 text-muted-foreground">
        Explore how implied volatility varies with strike and expiry.
      </p>
      <VolSurfaceViewer />
    </div>
  );
}
