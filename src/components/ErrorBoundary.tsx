import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 select-text">
          <div className="max-w-xl w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold">Application Error</h2>
                <p className="text-xs text-white/60">An unexpected error occurred while rendering the UI components.</p>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 text-xs font-mono text-red-300 overflow-x-auto max-h-48 overflow-y-auto">
              <p className="font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="mt-2 text-[11px] text-white/50 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg bg-[#24A0ED] hover:bg-[#1a85c8] active:scale-98 text-white font-medium text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
