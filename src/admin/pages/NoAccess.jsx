import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/admin/components/ui/button';
import { PERMISSION_LABEL } from '@/admin/constants/permissions';

/**
 * What an operator sees when they reach a page their role does not cover.
 *
 * It names the permission, because the useful next step is asking a super admin
 * for that specific one — not guessing why the page is blank.
 */
export function NoAccess({ permission }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-sunken text-faint">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="mt-3 text-[16px] font-semibold text-body">You do not have access to this</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {permission ? (
            <>
              This page needs the <span className="mono text-body">{permission}</span> permission
              {PERMISSION_LABEL[permission] ? ` (${PERMISSION_LABEL[permission].toLowerCase()})` : ''}. A super
              admin can grant it.
            </>
          ) : (
            'Ask a super admin if you need it.'
          )}
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link to="/admin">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
