import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    // Query active tab and get messages from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url?.includes('chatgpt.com')) {
        setStatus('ChatGPT detected');
      } else {
        setStatus('Navigate to chatgpt.com');
      }
    });
  }, []);

  const exportMessages = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          return window.chatGPTMessages?.getAll() || [];
        }
      }, (results) => {
        if (results && results[0]?.result) {
          setMessages(results[0].result);
        }
      });
    });
  };

  const downloadJSON = () => {
    const json = JSON.stringify(messages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-messages-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>ChatGPT Extension</h1>
      <p className="status">Status: {status}</p>

      <div className="actions">
        <button onClick={exportMessages}>Load Messages</button>
        {messages.length > 0 && (
          <button onClick={downloadJSON}>Download JSON</button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="messages">
          <h3>Messages ({messages.length})</h3>
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <strong>{msg.role}:</strong>
              <p>{msg.text.substring(0, 100)}...</p>
              <small>{msg.model || 'N/A'}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
