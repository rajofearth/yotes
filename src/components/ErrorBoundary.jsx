// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-semibold text-text-primary">Oops, something broke! 😫</h1>
          <p className="text-text-primary/60 mt-2">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-overlay/10 hover:bg-overlay/20 px-4 py-2 rounded"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;