import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PORTAL_BY_ROLE } from '@egna-enelaklo/shared';
import { Skeleton } from '@/components/ui';
import { useAuth } from './auth-context';
import { ForbiddenPage } from '@/features/errors/ForbiddenPage';

/** The full page loading state, used while the session is checked. */
export function PageLoader() {
  return (
    <div className="flex flex-col gap-4 py-6" role="status" aria-live="polite">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Only signed in people may see this. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

/** Sends a signed in person to the portal that belongs to their role. */
export function RequirePortal({
  children,
  portal,
}: {
  children: ReactNode;
  portal: 'app' | 'staff' | 'tasker';
}) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  const expected = PORTAL_BY_ROLE[user.role] ?? '/app';

  if (expected !== `/${portal}`) {
    return <Navigate to={expected} replace />;
  }

  return <>{children}</>;
}

/** Only people with the permission may see this. */
export function RequirePermission({
  children,
  permission,
}: {
  children: ReactNode;
  permission: string;
}) {
  const { hasPermission, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (!hasPermission(permission)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
