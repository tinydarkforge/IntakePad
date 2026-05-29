"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-bg p-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-text">Something went wrong</p>
            <p className="text-xs text-text-muted mt-2">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="mt-5 px-4 py-2 text-sm text-accent-fg bg-accent rounded-md hover:bg-accent-hover transition-colors font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
