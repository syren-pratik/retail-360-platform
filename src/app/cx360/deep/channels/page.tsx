export const dynamic = 'force-dynamic';

import channelDeepData from '../../../../../cache/cx360_channel_deep.json';
import ChannelDeepDiveContent from './ChannelDeepDiveContent';

export default function ChannelDeepDivePage() {
  return <ChannelDeepDiveContent data={channelDeepData as unknown} />;
}
