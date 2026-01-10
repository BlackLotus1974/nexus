'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4">
          <Alert
            variant="error"
            title="Something went wrong"
          >
            <div className="space-y-4">
              <p className="text-sm">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try again
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
