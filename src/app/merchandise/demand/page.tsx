export const dynamic = 'force-dynamic';

import MerchDemandShell from './MerchDemandShell';

export const metadata = {
  title: 'Merchandise Demand | Retail 360',
  description: 'Category-level demand intelligence for category managers',
};

export default function MerchandiseDemandPage() {
  return <MerchDemandShell />;
}
