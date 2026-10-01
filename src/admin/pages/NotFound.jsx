import { Link } from 'react-router-dom';
import { Button } from '@/admin/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <p className="mono text-[13px] text-faint">404</p>
        <h1 className="mt-1 text-[16px] font-semibold text-body">That page does not exist</h1>
        <Button asChild className="mt-4" size="sm">
          <Link to="/admin">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
