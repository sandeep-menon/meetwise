import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => {
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
  });
  const blockedCtrlKeys = new Set(["r", "p", "f", "g", "u"]);
  const blockedKeys = new Set(["F3", "F5", "F7", "BrowserBack", "BrowserForward", "BrowserRefresh"]);
  document.addEventListener("keydown", (e) => {
    const ctrlShortcut = e.ctrlKey && blockedCtrlKeys.has(e.key.toLowerCase());
    const altArrow = e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight");
    if (ctrlShortcut || altArrow || blockedKeys.has(e.key)) e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
