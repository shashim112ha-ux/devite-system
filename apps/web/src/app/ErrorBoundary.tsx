"use client";

import React from 'react';

export class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px', zIndex: 9999, position: 'relative' }}>
          <h1 style={{ color: 'red', fontSize: '24px', fontWeight: 'bold' }}>Something went wrong.</h1>
          <pre style={{ marginTop: '20px', background: 'rgba(255,0,0,0.1)', padding: '10px', borderRadius: '8px', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ marginTop: '10px', fontSize: '12px', color: 'gray' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
