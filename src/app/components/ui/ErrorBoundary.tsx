'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  chartName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch rendering errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReport = () => {
    // In production, this could open a bug report modal or send to error tracking
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      chartName: this.props.chartName,
      timestamp: new Date().toISOString(),
    };
    console.log('Error report:', errorDetails);
    alert('Error details logged to console. In production, this would submit a bug report.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-6 bg-rose-50 rounded-lg border border-rose-200">
          <AlertTriangle size={32} className="text-rose-500 mb-3" />
          <p className="text-sm font-medium text-rose-700 mb-1">
            Something went wrong rendering this {this.props.chartName || 'component'}
          </p>
          <p className="text-xs text-rose-600 mb-4 text-center max-w-xs">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-rose-600 border border-rose-300 rounded-md hover:bg-rose-50 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
            <button
              onClick={this.handleReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
            >
              <Bug size={14} />
              Report Issue
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  chartName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary chartName={chartName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Chart-specific error boundary with smaller footprint
 */
export function ChartErrorBoundary({
  children,
  chartName = 'chart',
}: {
  children: ReactNode;
  chartName?: string;
}) {
  return (
    <ErrorBoundary chartName={chartName}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
