import React, { useState, useEffect, useRef } from 'react';
import { APIClient } from '../modules/APIClient/index.js';
import { RequestBuilder } from '../modules/APIClient/endpoints/factories/index.js';
import { USER_CONFIG, API_CONFIG } from '../configuration/index.js';
import { eventBus } from '../content/core/eventBus.js';
import { EVENTS } from '../content/core/constants.js';

function App() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [platform, setPlatform] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const handleProjectChange = (e) => {
    const newValue = e.target.value;
    setSelectedProject(newValue);
    chrome.storage.local.set({ selectedProjectId: newValue });
  };

  const apiClientRef = useRef(null);
  const projectsRequestIdRef = useRef(null);

  useEffect(() => {
    // Load selected project from chrome.storage on mount
    try {
      chrome.storage.local.get(['selectedProjectId'], (result) => {
        if (result.selectedProjectId) {
          setSelectedProject(result.selectedProjectId);
        }
      });
    } catch (error) {
      console.warn('[Popup] Failed to load selected project from storage:', error);
    }

    // Initialize API Client
    const client = new APIClient({
      baseURL: API_CONFIG.BASE_URL,
    });
    client.init();
    apiClientRef.current = client;

    // Setup Event Listeners
    const handleApiSuccess = (data) => {
      if (data.requestId === projectsRequestIdRef.current) {
        console.log('[Popup] Projects API Success:', data);

        // Inspect the structure
        const response = data.response;
        console.log('[Popup] Raw Response:', response);

        // Try to extract the array
        let projectList = [];
        if (Array.isArray(response)) {
          projectList = response;
        } else if (response && Array.isArray(response.data)) {
          projectList = response.data;
        } else if (response && response.projects && Array.isArray(response.projects)) {
          projectList = response.projects;
        }

        console.log('[Popup] Extracted Project List:', projectList);
        setProjects(projectList);
        setIsLoadingProjects(false);
      }
    };

    const handleApiFailure = (data) => {
      if (data.requestId === projectsRequestIdRef.current) {
        console.error('[Popup] Failed to fetch projects:', data);
        console.error('[Popup] Error Details:', data.error);
        setIsLoadingProjects(false);
        setStatus('Error fetching projects');
      }
    };

    eventBus.on(EVENTS.API_REQUEST_SUCCESS, handleApiSuccess);
    eventBus.on(EVENTS.API_REQUEST_FAILED, handleApiFailure);

    // Fetch Projects
    if (USER_CONFIG.USER_ID) {
      setIsLoadingProjects(true);
      const request = RequestBuilder.getProjectsByUser(USER_CONFIG.USER_ID);
      const reqId = client.enqueueRequest(request);
      projectsRequestIdRef.current = reqId;
    } else {
      console.warn('No User ID found in configuration');
    }

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

    return () => {
      eventBus.off(EVENTS.API_REQUEST_SUCCESS, handleApiSuccess);
      eventBus.off(EVENTS.API_REQUEST_FAILED, handleApiFailure);
      if (apiClientRef.current) {
        apiClientRef.current.destroy();
      }
    };
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
          onChange={handleProjectChange}
          disabled={isLoadingProjects}
        >
          <option value="">
            {isLoadingProjects ? 'Loading projects...' : 'Select a project...'}
          </option>
          {projects.map((project) => {
            // Handle if project is just a string ID
            if (typeof project === 'string') {
              return (
                <option key={project} value={project}>
                  {project}
                </option>
              );
            }

            // Handle object with various possible keys
            const id = project.id || project._id || project.project_id || project.uuid;
            const name = project.name || project.title || project.projectName || project.label || project.project_name || id;

            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

export default App;
