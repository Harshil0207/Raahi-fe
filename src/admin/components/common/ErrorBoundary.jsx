import { Component } from 'react';
import { Button } from '@/admin/components/ui/button';

/**
 * Catches a render crash so one broken screen does not blank the console.
 *
 * The message is shown rather than hidden: the person reading it is an operator
 * who will paste it to whoever maintains this, and "something went wrong" wastes
 * that.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Console crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-app p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-[16px] font-semibold text-body">The console hit an error</h1>
          <p className="mt-2 text-[13px] text-muted">
            Nothing was lost — reloading usually clears it. If it keeps happening, this is the detail to report:
          </p>
          <pre className="mono mt-3 overflow-x-auto rounded-[var(--radius-card)] border border-hair bg-sunken p-3 text-left text-[11.5px] text-muted">
            {error.message}
          </pre>
          <Button className="mt-4" variant="primary" onClick={() => window.location.reload()}>
            Reload the console
          </Button>
        </div>
      </div>
    );
  }
}
