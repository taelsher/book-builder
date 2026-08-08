import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import "@mdxeditor/editor/style.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster position="bottom-right" />
  </>,
);
