import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught runtime error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c0b] text-[#f3f5ef] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl font-bold mb-4">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-xs text-[#a0aea5] max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected runtime error occurred.'}
          </p>
          <button
            type="button"
            className="px-6 py-2.5 rounded-full bg-[#d5f477] text-[#11140c] font-bold text-xs hover:bg-[#e4ff94] transition-all cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Reload Application ↻
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
