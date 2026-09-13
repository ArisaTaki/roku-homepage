import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import type { InitialAppReadiness } from "./bootReadiness";
import "lenis/dist/lenis.css";
import "./index.css";
import "./exhibition.css";
import "./deviceControls.css";

const BOOT_EXIT_MS = 360;
const BOOT_MARK = "HacchiRoku";
const BOOT_COLORS = ["mark-coral", "mark-yellow", "mark-cyan", "mark-lavender"];

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

function BootLoader({ exiting = false, issue, onContinue }: {
  exiting?: boolean;
  issue?: "fallback" | "timeout";
  onContinue: () => void;
}) {
  const language = document.documentElement.lang;
  const copy = language.startsWith("zh") ? {
    timeout: "加载有些慢，准备好后会自动进入。", failure: "部分内容暂时未能加载，可以重试或先进入页面。",
    retry: "重新加载", proceed: "先进入页面",
  } : language.startsWith("ja") ? {
    timeout: "読み込み中です。準備ができ次第、表示します。", failure: "一部を読み込めませんでした。再試行するか、そのまま進めます。",
    retry: "再読み込み", proceed: "先に進む",
  } : {
    timeout: "Still preparing. The page will open when it is ready.", failure: "Some content could not load. Retry or enter the page now.",
    retry: "Reload", proceed: "Enter now",
  };
  return (
    <div className={`boot-loader ${exiting ? "is-exiting" : ""}`} role="status" aria-label="Loading irop.one">
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
      {issue && !exiting && <div className="boot-notice">
        <p>{issue === "timeout" ? copy.timeout : copy.failure}</p>
        <div>
          <button type="button" onClick={() => window.location.reload()}>{copy.retry}</button>
          <button type="button" onClick={onContinue}>{copy.proceed}</button>
        </div>
      </div>}
    </div>
  );
}

function RootExperience() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [openingIssue, setOpeningIssue] = useState<"fallback" | "timeout">();
  const [showLoader, setShowLoader] = useState(true);
  const [loaderExiting, setLoaderExiting] = useState(false);

  const handleReady = useCallback((status: InitialAppReadiness) => {
    if (status === "ready") setAppReady(true);
    else if (status !== "aborted") setOpeningIssue(status);
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.inert = showLoader;
  }, [showLoader]);

  useEffect(() => {
    if (!appReady) return undefined;

    setLoaderExiting(true);
    const timeout = window.setTimeout(() => setShowLoader(false), BOOT_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [appReady]);

  return (
    <>
      <div ref={contentRef} aria-hidden={showLoader || undefined} data-opening-state={appReady ? "ready" : openingIssue ?? "preparing"}>
        <React.StrictMode>
          <App isBooting={!appReady} onReady={handleReady} />
        </React.StrictMode>
      </div>
      {showLoader ? <BootLoader exiting={loaderExiting} issue={openingIssue} onContinue={() => setAppReady(true)} /> : null}
    </>
  );
}

const reactRoot = createRoot(root);

reactRoot.render(<RootExperience />);
