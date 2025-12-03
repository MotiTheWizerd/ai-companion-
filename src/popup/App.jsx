import React, { useState, useEffect } from "react";

function App() {
  const [status, setStatus] = useState("Ready");
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    // Query active tab and detect platform
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || "";

      if (url.includes("chatgpt.com")) {
        setStatus("ChatGPT Detected");
        setPlatform("chatgpt");
      } else if (url.includes("claude.ai")) {
        setStatus("Claude Detected");
        setPlatform("claude");
      } else if (url.includes("chat.qwen.ai")) {
        setStatus("Qwen Detected");
        setPlatform("qwen");
      } else {
        setStatus("Navigate to ChatGPT, Claude, or Qwen");
        setPlatform(null);
      }
    });
  }, []);

  return (
    <div className="container">
      <h1>AI Conversation Bridge</h1>
      <p className={`status ${!platform ? "inactive" : ""}`}>{status}</p>

      <div className="info-section">
        <p className="info-text">
          {platform
            ? "✓ Extension active on this page"
            : "Open a supported AI chat to use the extension"}
        </p>
        {platform && (
          <p className="hint-text">
            Use the toolbar dropdown on the page to select a project
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
