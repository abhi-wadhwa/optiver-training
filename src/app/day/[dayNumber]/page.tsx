import { allDays } from '@/content/index';
import DayPageClient from './DayPageClient';

export function generateStaticParams() {
  return allDays.map((d) => ({ dayNumber: String(d.dayNumber) }));
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ dayNumber: string }>;
}) {
  const { dayNumber } = await params;
  return <DayPageClient dayNumber={parseInt(dayNumber, 10)} />;
}
