'use client';

export default function DayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-lg rounded-lg border p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-red-600">Something went wrong</h2>
        <pre className="mb-4 overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
        {error.digest && (
          <p className="mb-4 text-xs text-gray-500">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
