import { loadCache } from '@/app/lib/cache-loader';
import CategoryDeepDiveContent from './CategoryDeepDiveContent';

export const dynamic = 'force-dynamic';

export default async function CategoryDeepDivePage() {
  const data = await loadCache<unknown>('cx360_category_by_segment.json');
  return <CategoryDeepDiveContent data={data} />;
}
