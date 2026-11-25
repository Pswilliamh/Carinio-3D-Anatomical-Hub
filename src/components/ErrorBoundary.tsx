import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A192F] text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#112240] border border-cyan-500/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#FFD700]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">Application Diagnostic Notice</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed break-words font-mono bg-[#0A192F] p-3 rounded border border-slate-800">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00E5FF] text-[#0A192F] font-semibold text-sm rounded-lg hover:bg-cyan-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Workstation
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
