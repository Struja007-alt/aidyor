/**
 * @fileoverview Mobile detection hook
 * Provides responsive breakpoint detection for mobile layouts
 */

import * as React from "react";

/** Breakpoint threshold for mobile devices in pixels */
const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses matchMedia for efficient resize detection.
 * 
 * @returns {boolean} True if viewport width is below mobile breakpoint
 * 
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * 
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
