import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * Gates /app/* routes on a real Supabase session.
 *
 * While loading, renders nothing (avoids a flash of the redirect).
 * If signed out, redirects to /login and remembers the original
 * destination so we can return the user there after sign-in.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Minimal full-screen placeholder; the page transition animation
    // is intentionally skipped here to avoid a flash.
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export { Navigate };