import { Spinner } from '@/admin/components/ui/misc';

export function FullPageLoader({ label = 'Loading' }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-app">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="size-5" />
        <p className="text-[13px] text-muted">{label}</p>
      </div>
    </div>
  );
}
