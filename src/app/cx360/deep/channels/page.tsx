import { loadCache } from '@/app/lib/cache-loader';
import ChannelDeepDiveContent from './ChannelDeepDiveContent';

export const dynamic = 'force-dynamic';

export default async function ChannelDeepDivePage() {
  const data = await loadCache<unknown>('cx360_channel_deep.json');
  return <ChannelDeepDiveContent data={data} />;
}
