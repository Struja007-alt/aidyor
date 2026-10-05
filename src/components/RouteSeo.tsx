import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ORIGIN = "https://aidyor.app";

const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/faq$/,
  /^\/glossary(\/[a-z0-9-]+)?$/,
  /^\/api-docs$/,
  /^\/subscription$/,
  /^\/transparency$/,
  /^\/blog(\/[a-z0-9-]+)?$/,
  /^\/privacy-policy$/,
  /^\/terms-of-service$/,
  /^\/cookie-policy$/,
  /^\/disclaimer$/,
];

const getMeta = (attr: "name" | "property", key: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
};

const RouteSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
    const isPublic = PUBLIC_ROUTES.some((re) => re.test(path));
    const url = ORIGIN + path;

    getMeta("name", "robots").setAttribute(
      "content",
      isPublic ? "index, follow" : "noindex, nofollow"
    );

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (isPublic) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = url;
      getMeta("property", "og:url").setAttribute("content", url);
    } else if (canonical) {
      canonical.remove();
    }
  }, [pathname]);

  return null;
};

export default RouteSeo;