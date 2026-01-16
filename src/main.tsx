import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SplashScreen } from "@capacitor/splash-screen";

// Hide splash screen once app is mounted
const hideSplash = async () => {
  try {
    await SplashScreen.hide();
  } catch (error) {
    // SplashScreen not available (running in browser)
    console.log("SplashScreen not available:", error);
  }
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide splash after a small delay to ensure content is rendered
setTimeout(hideSplash, 100);