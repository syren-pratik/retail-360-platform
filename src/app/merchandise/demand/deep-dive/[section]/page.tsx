import DeepDiveShell from './DeepDiveShell';

export const dynamic = 'force-dynamic';

export default function DeepDivePage({ params }: { params: { section: string } }) {
  return <DeepDiveShell section={params.section} />;
}
