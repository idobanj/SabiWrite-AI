import { useLocation } from "react-router-dom";

/**
 * Wraps page content with the `page-fade-in` animation. Uses a key based on
 * pathname so the animation re-fires on route change.
 */
export function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-fade-in h-full">
      {children}
    </div>
  );
}
