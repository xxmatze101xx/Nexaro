"use client";

import React from "react";
import { clientLogger } from "@/lib/client-logger";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    clientLogger.error("error-boundary", error.message, {
      stack: error.stack?.slice(0, 500),
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-destructive/20 bg-destructive/5 text-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <div>
            <p className="text-sm font-medium text-foreground">Something went wrong</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">{this.state.errorMessage}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
