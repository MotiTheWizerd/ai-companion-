import React, { useState, useEffect } from "react";

function App() {
  const [status, setStatus] = useState("Ready");
  const [platform, setPlatform] = useState(null);
  const [memoryEnabled, setMemoryEnabled] = useState(true);

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

    // Load memory fetch setting from storage
    chrome.storage.local.get(["memoryFetchEnabled"], (result) => {
      // Default to true if not set
      setMemoryEnabled(result.memoryFetchEnabled !== false);
    });
  }, []);

  const handleMemoryToggle = () => {
    const newValue = !memoryEnabled;
    setMemoryEnabled(newValue);
    chrome.storage.local.set({ memoryFetchEnabled: newValue });
  };

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

      {platform && (
        <div className="settings-section">
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🧠</span>
              <div className="setting-text">
                <span className="setting-label">Memory Fetch</span>
                <span className="setting-description">
                  Inject context from semantic memory
                </span>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={handleMemoryToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
