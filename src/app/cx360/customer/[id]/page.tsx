import { notFound } from 'next/navigation';
import CustomerDetailContent from './CustomerDetailContent';
import customerTableData from '../../../../../cache/cx360_customer_table.json';
import { generateCustomerDetail } from '@/app/lib/generate-customer-detail';
import { transformCustomerRecords } from '@/app/lib/cache-transform';

export const dynamic = 'force-dynamic';

const customerTable = transformCustomerRecords(customerTableData as unknown[]);

interface CustomerDetailPageProps {
  params: { id: string };
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const customer = customerTable.find((c) => c.customer_id === params.id);

  if (!customer) {
    notFound();
  }

  const customerDetail = generateCustomerDetail(customer);

  return <CustomerDetailContent customer={customerDetail} />;
}
