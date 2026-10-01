import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { homeFor } from '@/routes/homeFor';

export default function NotFound() {
  const { isAuthenticated, role } = useAuth();
  const target = isAuthenticated ? homeFor(role) : '/login';

  return (
    <div className="grid min-h-dvh place-items-center bg-app px-6 text-center">
      <div className="max-w-sm space-y-5">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-sunken text-muted">
          <Compass className="size-7" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-body">Wrong turn</h1>
          <p className="text-sm text-muted">
            This page doesn&apos;t exist. Let&apos;s get you back on route.
          </p>
        </div>
        <Button asChild>
          <Link to={target}>{isAuthenticated ? 'Back to the app' : 'Sign in'}</Link>
        </Button>
      </div>
    </div>
  );
}
