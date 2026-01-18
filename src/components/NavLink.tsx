/**
 * @fileoverview NavLink component for styled navigation links
 * Extends React Router's NavLink with custom styling props
 */

import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the NavLink component
 * @interface NavLinkCompatProps
 */
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  /** Base CSS classes applied to the link */
  className?: string;
  /** CSS classes applied when the link is active */
  activeClassName?: string;
  /** CSS classes applied when navigation is pending */
  pendingClassName?: string;
}

/**
 * A styled navigation link component that extends React Router's NavLink.
 * Supports separate class names for base, active, and pending states.
 * 
 * @component
 * @example
 * ```tsx
 * <NavLink 
 *   to="/dashboard" 
 *   className="nav-link"
 *   activeClassName="nav-link--active"
 * >
 *   Dashboard
 * </NavLink>
 * ```
 */

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
