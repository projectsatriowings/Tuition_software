import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isChunkError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('text/html');
    return { hasError: true, error, errorInfo: null, isChunkError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TuitionOS ErrorBoundary] Caught an unhandled error:', error, errorInfo);

    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('text/html');

    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem('tuitionos_last_chunk_reload') || '0');
      const now = Date.now();
      if (now - lastReload > 10000) {
        sessionStorage.setItem('tuitionos_last_chunk_reload', String(now));
        window.location.reload();
        return;
      }
    }

    this.setState({ error, errorInfo, isChunkError });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndLogin = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-[#F7F2EF] flex items-center justify-center p-6 text-[#2D1E18]">
            <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-[#D7CCC8] shadow-xl text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="w-8 h-8 text-amber-700" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[#2D1E18]">New Update Available</h2>
                <p className="text-xs text-[#6D4C41] leading-relaxed">
                  A new version of TuitionOS has been deployed. Please reload the page to load the latest components.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Update & Reload Application</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleClearAndLogin}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#FAF8F5] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Reset & Login</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#F7F2EF] flex items-center justify-center p-6 text-[#2D1E18]">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-[#D7CCC8] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8 text-amber-700" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#2D1E18]">Something unexpected happened</h2>
              <p className="text-xs text-[#6D4C41] leading-relaxed">
                TuitionOS caught an unexpected render issue. You can reload the application or return to the login screen.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs font-mono text-red-900 max-h-32 overflow-y-auto">
                <div className="font-bold mb-1">Error:</div>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#3E2723] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearAndLogin}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#D7CCC8] text-[#6D4C41] hover:bg-[#FAF8F5] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Reset & Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
