import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./lib/pwa-register";

registerPWA();

// Hide splash screen once app is mounted (dynamic import to avoid React init issues)
const hideSplash = async () => {
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch (error) {
    // SplashScreen not available (running in browser)
    console.log("SplashScreen not available");
  }
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide splash after a small delay to ensure content is rendered
setTimeout(hideSplash, 100);