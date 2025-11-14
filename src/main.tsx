import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// import "./utils/serviceWorkerManager"; // Désactivé car PWA désactivée

createRoot(document.getElementById("root")!).render(<App />);
