'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductPricingDetailContent from './ProductPricingDetailContent';
import NoDataScreen from '@/app/components/ui/NoDataScreen';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { PriceProductRow } from '@/app/lib/price-types';
import { generateProductPricingDetail, ProductPricingDetail } from '@/app/lib/generate-product-pricing-detail';

export default function ProductPricingDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<ProductPricingDetail | null>(null);

  useEffect(() => {
    async function fetchProductData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch product table from cache
        const response = await fetch('/api/cache/price_product_table');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to fetch product data');
        }

        const result = await response.json();
        const productTable = result.data as PriceProductRow[];

        // Find the specific product
        const product = productTable.find((p) => p.product_id === productId);

        if (!product) {
          setError(`Product ${productId} not found`);
          return;
        }

        const detail = generateProductPricingDetail(product);
        setProductDetail(detail);
      } catch (err) {
        console.error('Failed to fetch product data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product data');
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error or not found state
  if (error || !productDetail) {
    return (
      <NoDataScreen
        title="Product Not Found"
        description={error || 'Unable to load product pricing details. Please refresh the cache.'}
        showRefreshButton={true}
        error={error}
      />
    );
  }

  return <ProductPricingDetailContent productDetail={productDetail} />;
}
