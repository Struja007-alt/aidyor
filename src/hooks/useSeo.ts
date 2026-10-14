import { useEffect } from "react";

const SITE = "https://aidyor.app";

interface SeoOptions {
  title: string;
  description: string;
  path: string; // e.g. "/glossary"
}

/**
 * Sets title, meta description and canonical for the current page,
 * and restores the previous values when the page unmounts.
 */
export const useSeo = ({ title, description, path }: SeoOptions) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? null;
    desc?.setAttribute("content", description);

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${SITE}${path}`);

    return () => {
      document.title = prevTitle;
      if (desc && prevDesc !== null) desc.setAttribute("content", prevDesc);
      if (canonical && prevCanonical !== null) {
        canonical.setAttribute("href", prevCanonical);
      }
    };
  }, [title, description, path]);
};