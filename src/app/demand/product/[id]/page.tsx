import { notFound } from 'next/navigation';
import ProductDetailContent from './ProductDetailContent';
import skuTableData from '../../../../../cache/demand_sku_table.json';
import { SKUForecast } from '@/app/lib/demand-types';
import { generateProductDetail } from '@/app/lib/generate-product-detail';

const skuTable = skuTableData as SKUForecast[];

interface ProductDetailPageProps {
  params: { id: string };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = skuTable.find((p) => p.product_id === params.id);

  if (!product) {
    notFound();
  }

  const productDetail = generateProductDetail(product);

  return <ProductDetailContent product={productDetail} />;
}

// Generate static params for all products
export function generateStaticParams() {
  return skuTable.map((product) => ({
    id: product.product_id,
  }));
}
