import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [platform, setPlatform] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');

  // Mock project data
  const projects = [
    { id: '1', name: 'AI Research Platform' },
    { id: '2', name: 'Customer Support Bot' },
    { id: '3', name: 'Content Generation' },
    { id: '4', name: 'Data Analysis Tool' },
    { id: '5', name: 'Personal Assistant' }
  ];

  useEffect(() => {
    // Query active tab and get messages from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';

      if (url.includes('chatgpt.com')) {
        setStatus('ChatGPT Detected');
        setPlatform('chatgpt');
      } else if (url.includes('claude.ai')) {
        setStatus('Claude Detected');
        setPlatform('claude');
      } else if (url.includes('chat.qwen.ai')) {
        setStatus('Qwen Detected');
        setPlatform('qwen');
      } else {
        setStatus('Navigate to ChatGPT, Claude, or Qwen');
        setPlatform(null);
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
      <h1>AI Conversation Bridge</h1>
      <p className={`status ${!platform ? 'inactive' : ''}`}>{status}</p>

      <div className="project-selector">
        <label htmlFor="project-select">Project</label>
        <select
          id="project-select"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default App;
