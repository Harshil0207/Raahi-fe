import { Component } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept in the console for developers; the user sees the message below.
    console.error('Unhandled UI error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-app px-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-body">Something broke on this screen</h1>
          <p className="text-sm text-muted">
            The app hit an unexpected error. Reloading usually clears it — your ride is unaffected.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden />
            Reload the app
          </Button>
        </div>
      </div>
    );
  }
}
