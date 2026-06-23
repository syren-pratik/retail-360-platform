import PriceIntelDeepDiveShell from './PriceIntelDeepDiveShell';

export const dynamic = 'force-dynamic';

export default function PriceIntelDeepDivePage({ params }: { params: { section: string } }) {
  return <PriceIntelDeepDiveShell section={params.section} />;
}
