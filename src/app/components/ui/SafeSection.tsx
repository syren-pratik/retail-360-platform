'use client';

import { Component, ReactNode } from 'react';

interface SafeSectionProps {
  data: unknown;
  title: string;
  children: ReactNode;
  requiredKeys?: string[];  // If data is object, check these keys exist
  expectArray?: boolean;     // If true, data must be a non-empty array
  className?: string;
}

interface SafeSectionState {
  hasError: boolean;
  error?: Error;
}

export class SafeSection extends Component<SafeSectionProps, SafeSectionState> {
  state: SafeSectionState = { hasError: false };

  static getDerivedStateFromError(error: Error): SafeSectionState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`SafeSection "${this.props.title}" crashed:`, error.message);
  }

  render() {
    const { data, title, children, requiredKeys, expectArray, className = '' } = this.props;

    // 1. Error boundary caught a crash
    if (this.state.hasError) {
      return (
        <div className={`card p-6 text-center ${className}`}>
          <p className="text-sm text-red-600">Failed to render: {title}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-[var(--accent-primary)] underline mt-2"
          >
            Retry
          </button>
        </div>
      );
    }

    // 2. No data at all - show placeholder
    if (data === null || data === undefined) {
      return (
        <div className={`card p-8 text-center ${className}`}>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Data not loaded. Click &quot;Refresh Data&quot; to populate.
          </p>
        </div>
      );
    }

    // 3. Expected array but got something else
    if (expectArray && !Array.isArray(data)) {
      return (
        <div className={`card p-6 text-center ${className}`}>
          <p className="text-sm text-amber-600">{title}: unexpected data format</p>
        </div>
      );
    }

    // 4. Empty array
    if (Array.isArray(data) && data.length === 0) {
      return (
        <div className={`card p-8 text-center ${className}`}>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">No records found</p>
        </div>
      );
    }

    // 5. Required keys missing
    if (requiredKeys && typeof data === 'object' && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      const missing = requiredKeys.filter(k => !(k in dataObj));
      if (missing.length > 0) {
        return (
          <div className={`card p-6 text-center ${className}`}>
            <p className="text-sm text-amber-600">{title}: missing data fields</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{missing.join(', ')}</p>
          </div>
        );
      }
    }

    // 6. Data is valid - render children
    return <>{children}</>;
  }
}

// Functional wrapper for simpler use cases
export function withSafeData<T>(
  data: T | null | undefined,
  render: (data: T) => ReactNode,
  fallback?: ReactNode
): ReactNode {
  if (data === null || data === undefined) {
    return fallback || null;
  }
  if (Array.isArray(data) && data.length === 0) {
    return fallback || null;
  }
  return render(data);
}
