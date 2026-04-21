/**
 * Data Contracts
 * Define expected shapes for each cache file and validate data against them
 */

export interface DataContract {
  required: string[];
  type?: 'array' | 'object';
  types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  sample?: Record<string, unknown>;
}

// Define the expected shape for each cache file
export const DATA_CONTRACTS: Record<string, DataContract> = {
  // ═══ CX360 MODULE ═══
  cx360_kpis: {
    required: ['total_customers', 'avg_clv', 'churn_rate_pct', 'active_rate_pct'],
    type: 'object',
    types: {
      total_customers: 'number',
      avg_clv: 'number',
      churn_rate_pct: 'number',
      active_rate_pct: 'number',
    },
  },

  cx360_clv_distribution: {
    required: ['clv_tier', 'customer_count', 'avg_clv'],
    type: 'array',
    types: {
      clv_tier: 'string',
      customer_count: 'number',
      avg_clv: 'number',
    },
  },

  cx360_churn_risk: {
    required: ['churn_risk_tier', 'customer_count'],
    type: 'array',
    types: {
      churn_risk_tier: 'string',
      customer_count: 'number',
    },
  },

  cx360_churn_drivers: {
    required: ['feature_name', 'importance'],
    type: 'array',
    types: {
      feature_name: 'string',
      importance: 'number',
    },
  },

  cx360_cohort_retention: {
    required: ['cohort_month', 'period_number', 'retention_rate'],
    type: 'array',
    types: {
      cohort_month: 'string',
      period_number: 'number',
      retention_rate: 'number',
    },
  },

  cx360_rfm_sample: {
    required: ['customer_id', 'recency_days', 'purchase_frequency', 'clv_12m'],
    type: 'array',
    types: {
      customer_id: 'string',
      recency_days: 'number',
      purchase_frequency: 'number',
      clv_12m: 'number',
    },
  },

  cx360_customer_table: {
    required: ['customer_id', 'customer_segment'],
    type: 'array',
    types: {
      customer_id: 'string',
      customer_segment: 'string',
    },
  },

  cx360_at_risk_alerts: {
    required: [],
    type: 'array',
  },

  // ═══ DEMAND MODULE ═══
  demand_kpis: {
    required: ['forecast_accuracy_pct', 'total_skus'],
    type: 'object',
    types: {
      forecast_accuracy_pct: 'number',
      total_skus: 'number',
    },
  },

  demand_forecast: {
    required: ['target_date_id', 'forecast_qty'],
    type: 'array',
    types: {
      target_date_id: 'number',
      forecast_qty: 'number',
    },
  },

  demand_accuracy_by_dept: {
    required: [],
    type: 'array',
  },

  demand_accuracy_trend: {
    required: [],
    type: 'array',
  },

  demand_sku_table: {
    required: ['product_id', 'product_name'],
    type: 'array',
    types: {
      product_id: 'string',
      product_name: 'string',
    },
  },

  demand_alerts: {
    required: [],
    type: 'array',
  },

  demand_forecast_vs_actual: {
    required: [],
    type: 'array',
  },

  // ═══ INVENTORY MODULE ═══
  inventory_kpis: {
    required: ['total_skus', 'avg_dos'],
    type: 'array', // Databricks returns array with single row
    types: {
      total_skus: 'string', // Databricks returns as string
      avg_dos: 'string',
    },
  },

  inventory_health_matrix: {
    required: ['product_id', 'department', 'days_of_stock', 'status'],
    type: 'array',
    types: {
      product_id: 'string',
      department: 'string',
      days_of_stock: 'number',
      status: 'string',
    },
  },

  inventory_dos_distribution: {
    required: ['dos_bucket', 'sku_count'],
    type: 'array',
    types: {
      dos_bucket: 'string',
      sku_count: 'number',
    },
  },

  inventory_dos_by_dept: {
    required: ['department', 'avg_dos'],
    type: 'array',
    types: {
      department: 'string',
      avg_dos: 'number',
    },
  },

  inventory_stockout_trend: {
    required: ['month', 'stockout_count'],
    type: 'array',
    types: {
      month: 'string',
      stockout_count: 'number',
    },
  },

  inventory_stockout_top_skus: {
    required: ['product_id', 'product_name'],
    type: 'array',
    types: {
      product_id: 'string',
      product_name: 'string',
    },
  },

  inventory_safety_stock: {
    required: ['department', 'abc_class'],
    type: 'array',
  },

  inventory_replenishment: {
    required: ['product_id', 'store_id', 'current_stock'],
    type: 'array',
    types: {
      product_id: 'string',
      store_id: 'string',
      current_stock: 'number',
    },
  },

  inventory_inbound: {
    required: ['product_id', 'store_id'],
    type: 'array',
  },

  inventory_alerts: {
    required: [],
    type: 'array',
  },

  // ═══ PRICE MODULE ═══
  price_kpis: {
    required: ['total_products', 'avg_margin_pct'],
    type: 'array',
    types: {
      total_products: 'number',
      avg_margin_pct: 'number',
    },
  },

  price_recommendations: {
    required: ['product_id', 'current_price', 'recommended_price'],
    type: 'array',
    types: {
      product_id: 'string',
      current_price: 'number',
      recommended_price: 'number',
    },
  },

  price_product_table: {
    required: ['product_id', 'product_name'],
    type: 'array',
    types: {
      product_id: 'string',
      product_name: 'string',
    },
  },

  price_elasticity_heatmap: {
    required: ['department', 'avg_elasticity'],
    type: 'array',
  },

  price_alerts: {
    required: [],
    type: 'array',
  },

  // ═══ SHARED ═══
  dimensions: {
    required: ['dim_type', 'id', 'name'],
    type: 'array',
    types: {
      dim_type: 'string',
      id: 'string',
      name: 'string',
    },
  },
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount?: number;
  sampleKeys?: string[];
}

// Validator function
export function validateDataContract(cacheKey: string, data: unknown): ValidationResult {
  const contract = DATA_CONTRACTS[cacheKey];
  if (!contract) {
    return { valid: true, errors: [], warnings: [`No contract defined for ${cacheKey}`] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  let rowCount = 0;
  let sampleKeys: string[] = [];

  // Check if array when expected
  if (contract.type === 'array') {
    if (!Array.isArray(data)) {
      errors.push(`Expected array, got ${typeof data}`);
      return { valid: false, errors, warnings };
    }
    rowCount = (data ?? []).length;
    if (data.length === 0) {
      warnings.push('Array is empty');
      return { valid: true, errors, warnings, rowCount, sampleKeys };
    }
    // Check first row for required keys
    const firstRow = data[0] as Record<string, unknown>;
    sampleKeys = Object.keys(firstRow);
    for (const key of contract.required) {
      if (!(key in firstRow)) {
        errors.push(`Missing required key: ${key}`);
      }
    }
    // Check types
    if (contract.types) {
      for (const [key, expectedType] of Object.entries(contract.types)) {
        if (key in firstRow) {
          const actualType = typeof firstRow[key];
          // Allow string-to-number coercion for Databricks results
          if (expectedType === 'number' && actualType === 'string') {
            const parsed = parseFloat(firstRow[key] as string);
            if (isNaN(parsed)) {
              warnings.push(`Type mismatch: ${key} should be ${expectedType}, got non-numeric string`);
            }
          } else if (actualType !== expectedType) {
            warnings.push(`Type mismatch: ${key} should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
  } else {
    // Check object (handles both single object and array with single row)
    let obj: Record<string, unknown>;
    if (Array.isArray(data)) {
      if (data.length === 0) {
        warnings.push('Array is empty');
        return { valid: true, errors, warnings, rowCount: 0 };
      }
      obj = data[0] as Record<string, unknown>;
      rowCount = 1;
    } else if (typeof data !== 'object' || data === null) {
      errors.push(`Expected object, got ${typeof data}`);
      return { valid: false, errors, warnings };
    } else {
      obj = data as Record<string, unknown>;
      rowCount = 1;
    }
    sampleKeys = Object.keys(obj);
    for (const key of contract.required) {
      if (!(key in obj)) {
        errors.push(`Missing required key: ${key}`);
      }
    }
    // Check types
    if (contract.types) {
      for (const [key, expectedType] of Object.entries(contract.types)) {
        if (key in obj) {
          const actualType = typeof obj[key];
          if (expectedType === 'number' && actualType === 'string') {
            const parsed = parseFloat(obj[key] as string);
            if (isNaN(parsed)) {
              warnings.push(`Type mismatch: ${key} should be ${expectedType}, got non-numeric string`);
            }
          } else if (actualType !== expectedType) {
            warnings.push(`Type mismatch: ${key} should be ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rowCount,
    sampleKeys,
  };
}

// Get all cache keys with contracts
export function getAllContractKeys(): string[] {
  return Object.keys(DATA_CONTRACTS);
}
