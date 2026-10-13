const KEY = "aidyor_cookie_consent";

export type Consent = "accepted" | "rejected" | null;

export const getConsent = (): Consent => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
};

export const setConsent = (value: "accepted" | "rejected") => {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // storage unavailable; choice applies for this session only
  }
};

let loaded = false;

/** Loads Google Analytics and Alphie. Call only after the visitor accepts. */
export const loadTrackers = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;

  // Google Analytics
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", "G-CC7WEBMELD");

  const ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=G-CC7WEBMELD";
  document.head.appendChild(ga);

  // Alphie
  const alphie = document.createElement("script");
  alphie.async = true;
  alphie.src = "https://q.meetalphie.com/widget/widget-sdk.min.js";
  alphie.setAttribute(
    "data-widget-api-key",
    "wk_798a880436fff0d69139badb447116619af62c5d099fabce"
  );
  alphie.setAttribute("data-widget-base-url", "https://q.meetalphie.com");
  alphie.setAttribute("data-widget-consent", "auto");
  document.head.appendChild(alphie);
};