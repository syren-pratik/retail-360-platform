export const dynamic = 'force-dynamic';

import categoryData from '../../../../../cache/cx360_category_by_segment.json';
import CategoryDeepDiveContent from './CategoryDeepDiveContent';

export default function CategoryDeepDivePage() {
  return <CategoryDeepDiveContent data={categoryData as unknown} />;
}
