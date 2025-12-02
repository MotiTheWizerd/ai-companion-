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
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedLabel = selectedOption ? selectedOption.textContent.trim() : '';

    console.log('[Popup] Project changed to:', newValue, selectedLabel);
    setSelectedProject(newValue);

    const payload = {
      selectedProjectId: newValue || null,
      selectedProjectName: newValue ? (selectedLabel || newValue) : null,
    };

    // Save to chrome.storage with error handling
    try {
      chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Error saving selected project:', chrome.runtime.lastError);
        } else {
          console.log('[Popup] Selected project saved to storage:', payload);
        }
      });
    } catch (error) {
      console.error('[Popup] Failed to save selected project:', error);
    }
  };

  const apiClientRef = useRef(null);
  const projectsRequestIdRef = useRef(null);

  useEffect(() => {
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

        // Save projects to cache in user_settings
        try {
          chrome.storage.local.get(['user_settings'], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('[Popup] Error accessing storage for cache save:', chrome.runtime.lastError);
              return;
            }
            const userSettings = result.user_settings || {};
            userSettings.projects = projectList;
            chrome.storage.local.set({ user_settings: userSettings }, () => {
              if (chrome.runtime.lastError) {
                console.warn('[Popup] Error saving to cache:', chrome.runtime.lastError);
              } else {
                console.log('[Popup] Projects cached to user_settings');
              }
            });
          });
        } catch (error) {
          console.warn('[Popup] Failed to cache projects:', error);
        }
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

    // Load both selected project and projects list from storage together
    try {
      chrome.storage.local.get(['selectedProjectId', 'user_settings'], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[Popup] Error loading from storage:', chrome.runtime.lastError);
          // Fall back to fetching from server
          if (USER_CONFIG.USER_ID) {
            setIsLoadingProjects(true);
            const request = RequestBuilder.getProjectsByUser(USER_CONFIG.USER_ID);
            const reqId = client.enqueueRequest(request);
            projectsRequestIdRef.current = reqId;
          } else {
            console.warn('No User ID found in configuration');
            setIsLoadingProjects(false);
          }
          return;
        }

        // Load selected project first
        if (result.selectedProjectId) {
          console.log('[Popup] Loaded selected project from storage:', result.selectedProjectId);
          setSelectedProject(result.selectedProjectId);
        } else {
          console.log('[Popup] No previously selected project found');
        }

        // Then load cached projects
        const cachedProjects = result.user_settings?.projects;

        if (cachedProjects && Array.isArray(cachedProjects) && cachedProjects.length > 0) {
          // Use cached projects immediately for speed
          console.log('[Popup] Loading projects from cache (stale-while-revalidate):', cachedProjects);
          setProjects(cachedProjects);
          // Don't set isLoadingProjects to false yet, as we are about to fetch fresh data
        }

        // Always fetch fresh data from server to update cache
        console.log('[Popup] Fetching fresh projects from server...');
        if (USER_CONFIG.USER_ID) {
          setIsLoadingProjects(true);
          const request = RequestBuilder.getProjectsByUser(USER_CONFIG.USER_ID);
          const reqId = client.enqueueRequest(request);
          projectsRequestIdRef.current = reqId;
        } else {
          console.warn('No User ID found in configuration');
          setIsLoadingProjects(false);
        }
      });
    } catch (error) {
      console.error('[Popup] Failed to access chrome.storage:', error);
      // Fall back to fetching from server
      if (USER_CONFIG.USER_ID) {
        setIsLoadingProjects(true);
        const request = RequestBuilder.getProjectsByUser(USER_CONFIG.USER_ID);
        const reqId = client.enqueueRequest(request);
        projectsRequestIdRef.current = reqId;
      } else {
        console.warn('No User ID found in configuration');
        setIsLoadingProjects(false);
      }
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
