import { allDays } from '@/content/index';
import DayPageLoader from './DayPageLoader';

export function generateStaticParams() {
  return allDays.map((d) => ({ dayNumber: String(d.dayNumber) }));
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ dayNumber: string }>;
}) {
  const { dayNumber } = await params;
  return <DayPageLoader dayNumber={parseInt(dayNumber, 10)} />;
}
