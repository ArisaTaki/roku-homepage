import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const MIN_LOADING_MS = 1000;
const BOOT_MARK = "HacchiRoku";
const BOOT_COLORS = ["mark-coral", "mark-yellow", "mark-cyan", "mark-lavender"];

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

function BootLoader() {
  return (
    <div className="boot-loader" role="status" aria-label="Loading irop.one">
      <div className="boot-mark" aria-hidden="true">
        {Array.from(BOOT_MARK).map((letter, index) => (
          <span
            className={`mark-letter ${BOOT_COLORS[index % BOOT_COLORS.length]}`}
            style={{ animationDelay: `${index * 82}ms` }}
            key={`${letter}-${index}`}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

function RootExperience() {
  const [appReady, setAppReady] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const isReady = appReady && minimumElapsed;

  useEffect(() => {
    const timeout = window.setTimeout(() => setMinimumElapsed(true), MIN_LOADING_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleReady = useCallback(() => {
    setAppReady(true);
  }, []);

  return (
    <>
      <React.StrictMode>
        <App isBooting={!isReady} onReady={handleReady} />
      </React.StrictMode>
      {!isReady ? <BootLoader /> : null}
    </>
  );
}

const reactRoot = createRoot(root);

reactRoot.render(<RootExperience />);
