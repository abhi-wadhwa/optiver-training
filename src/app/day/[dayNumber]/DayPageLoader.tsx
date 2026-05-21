'use client';

import dynamic from 'next/dynamic';

const DayPageClient = dynamic(() => import('./DayPageClient'), { ssr: false });

export default function DayPageLoader({ dayNumber }: { dayNumber: number }) {
  return <DayPageClient dayNumber={dayNumber} />;
}
