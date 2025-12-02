import { HeaderToolbar } from "../SemantixUIComponents/index.js";
import { eventBus } from "../../content/core/eventBus.js";

/**
 * Controls the injection and management of the toolbar.
 * The toolbar is injected into the <body> element and positioned fixed at the top center.
 */
export class ToolbarController {
  constructor(conversationManager, chatHistoryManager) {
    this.conversationManager = conversationManager;
    this.chatHistoryManager = chatHistoryManager;
    this.observer = null;
    this.isInitialized = false;
    this.retryCount = 0;
    this.toolbarElement = null; // Store reference to toolbar element
    this.statusTextElement = null;
    this.statusDotElement = null;
    this.projectDisplayText = "Project: Loading...";
    this.hasProjectSelected = false;
    this.storageListener = null;
    this.projectInfoCache = null;
    this.projectBridgeResolvers = [];
    this.bridgeRequestPending = false;
    this.projectBridgeHandler = null;
    this.storageWarningLogged = false;
  }

  init() {
    if (this.isInitialized) return;
    console.log("[ToolbarController] Initialized");

    // Register callback early to catch conversations detected after init
    if (this.chatHistoryManager) {
      this.chatHistoryManager.onConversationCaptured((claudeData) => {
        console.log(
          "[ToolbarController] onConversationCaptured callback triggered with data",
        );
        this.showSettingsIcon();
        // Automatic import removed as per user request.
        // Import is now triggered only via settings icon click.
      });
    }

    this.startObserver();
    this.registerStorageListener();
    this.isInitialized = true;
  }

  startObserver() {
    if (!document.body) {
      console.log("[ToolbarController] document.body not ready, waiting...");
      window.addEventListener("DOMContentLoaded", () => this.startObserver());
      return;
    }

    console.log("[ToolbarController] Starting MutationObserver...");
    this.observer = new MutationObserver((mutations) => {
      console.log(
        "[ToolbarController] MutationObserver triggered, mutations count:",
        mutations.length,
      );
      this.attemptInjection();
    });

    this.observer.observe(document.body, { childList: true, subtree: true });

    // Initial injection attempt
    this.attemptInjection();
  }

  attemptInjection() {
    console.log("[ToolbarController] attemptInjection called");
    const selectors = this.conversationManager.getSelectors();
    const toolbarSelector = selectors.getToolbar();
    const position = selectors.getToolbarPosition();
    const parentLevels = selectors.provider.getParentLevels
      ? selectors.provider.getParentLevels()
      : 0;
    console.log(
      "[ToolbarController] Using selector:",
      toolbarSelector,
      "position:",
      position,
      "parentLevels:",
      parentLevels,
    );

    let targetElement = document.querySelector(toolbarSelector);
    console.log("[ToolbarController] Initial element found:", targetElement);

    // Traverse up parent levels if specified
    for (let i = 0; i < parentLevels && targetElement; i++) {
      targetElement = targetElement.parentElement;
    }
    console.log(
      "[ToolbarController] Target element after traversal:",
      targetElement,
    );
    const existingToolbar = document.querySelector(".semantix-header-toolbar");

    if (!targetElement) {
      if (this.retryCount < 10) {
        this.retryCount++;
        console.warn(
          "[ToolbarController] Target not found, retry attempt",
          this.retryCount,
        );
        setTimeout(() => this.attemptInjection(), 500);
      } else {
        console.error(
          "[ToolbarController] Max retry attempts reached, giving up.",
        );
      }
      return;
    }

    if (existingToolbar) {
      console.log(
        "[ToolbarController] Toolbar already exists, skipping injection",
      );
      return;
    }

    console.log("[ToolbarController] Found target element, injecting toolbar");
    this.injectToolbar(targetElement, position);
  }

  injectToolbar(targetElement, position) {
    // Create toolbar without settings icon initially
    const toolbarHtml = this.getHeaderToolbarHTML(false); // Don't show settings icon initially
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = toolbarHtml;
    const toolbarElement = tempDiv.firstElementChild;
    this.toolbarElement = toolbarElement;

    // Store reference to status text element to update it later
    this.statusTextElement = toolbarElement.querySelector(
      ".semantix-status-text",
    );
    this.statusDotElement = toolbarElement.querySelector(
      ".semantix-status-dot",
    );
    this.updateStatusIndicator(false);
    this.refreshProjectStatusText();

    // Add click event to settings icon (will be added later when needed)
    // Styles are now handled by CSS class .semantix-header-toolbar

    // Insert according to requested position
    if (position === "after") {
      targetElement.parentNode.insertBefore(
        toolbarElement,
        targetElement.nextSibling,
      );
    } else if (position === "before") {
      targetElement.parentNode.insertBefore(toolbarElement, targetElement);
    } else if (position === "prepend") {
      // Insert as first child of target element
      targetElement.insertBefore(toolbarElement, targetElement.firstChild);
    } else if (position === "append") {
      targetElement.appendChild(toolbarElement);
    } else {
      targetElement.appendChild(toolbarElement);
    }

    console.log(
      "[ToolbarController] Toolbar injected (without settings icon initially)",
    );

    // Note: callback for showing settings icon is now registered in init()
    // to ensure it catches conversations detected early
  }

  /**
   * Get HTML for the header toolbar
   * @param {boolean} showSettingsIcon - Whether to include the settings icon
   * @returns {string} HTML string for the toolbar
   */
  getHeaderToolbarHTML(showSettingsIcon) {
    if (showSettingsIcon) {
      return `
                <div class='semantix-header-toolbar'>
                    <span class="semantix-status-dot offline"></span>
                    <span class="semantix-status-text">Active</span>
                    <span class="semantix-settings-icon">âš™ï¸</span>
                </div>
            `;
    } else {
      return `
                <div class='semantix-header-toolbar'>
                    <span class="semantix-status-dot offline"></span>
                    <span class="semantix-status-text">Project: Loading...</span>
                </div>
            `;
    }
  }

  /**
   * Show the settings icon in the toolbar after conversation is captured
   */
  showSettingsIcon() {
    console.log(
      "[ToolbarController] Showing settings icon after conversation capture",
    );

    if (this.toolbarElement) {
      // Update the status text
      if (this.statusTextElement) {
        this.statusTextElement.classList.add("active");
        this.statusTextElement.textContent = this.projectDisplayText;
        this.statusTextElement.className = "semantix-status-text active";
      }
      this.updateStatusIndicator(this.hasProjectSelected);

      // Check if settings icon already exists
      const existingIcon = this.toolbarElement.querySelector(
        ".semantix-settings-icon",
      );
      if (existingIcon) {
        console.log(
          "[ToolbarController] Settings icon already exists, skipping",
        );
        return;
      }

      // Add the settings icon to the existing toolbar
      const settingsIcon = document.createElement("span");
      settingsIcon.className = "semantix-settings-icon";
      settingsIcon.textContent = "âš™ï¸";

      // Add click event to settings icon
      settingsIcon.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log("[ToolbarController] Settings icon clicked");

        // Create a simple settings popup or trigger settings functionality
        this.openSettings();
      });

      // Add the settings icon to the toolbar
      this.toolbarElement.appendChild(settingsIcon);
      console.log("[ToolbarController] Settings icon added to toolbar");
    }
  }

  openSettings() {
    // Create a simple settings modal or trigger settings functionality
    console.log("[ToolbarController] Opening settings");

    // Emit event to trigger chat import flow after settings opened
    try {
      eventBus.emit("import:chat", { source: "toolbar-settings" });
      console.log('[ToolbarController] Emitted event "import:chat"');
    } catch (err) {
      console.error(
        "[ToolbarController] Failed to emit import:chat event",
        err,
      );
    }
  }

  registerStorageListener() {
    if (!this.canUseChromeStorage()) {
      if (!this.storageWarningLogged) {
        console.info(
          "[ToolbarController] chrome.storage not available, using loader bridge",
        );
        this.storageWarningLogged = true;
      }
      this.setupProjectBridgeChannel();
      return;
    }

    this.storageListener = (changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes.selectedProjectId ||
      changes.selectedProjectName ||
      changes.user_settings
    ) {
        console.log(
          "[ToolbarController] Detected project change in storage, refreshing toolbar text",
        );
        this.refreshProjectStatusText();
      }
    };

    chrome.storage.onChanged.addListener(this.storageListener);
  }

  async refreshProjectStatusText() {
    if (!this.statusTextElement) {
      return;
    }
    const statusInfo = await this.getProjectStatus();
    this.applyStatusInfo(statusInfo);
  }

  updateStatusIndicator(hasProject) {
    if (!this.statusDotElement) return;
    this.statusDotElement.classList.toggle("online", hasProject);
    this.statusDotElement.classList.toggle("offline", !hasProject);
  }

  applyStatusInfo(statusInfo) {
    if (!statusInfo) return;
    this.projectDisplayText = statusInfo.text;
    this.hasProjectSelected = statusInfo.hasProject;
    if (this.statusTextElement) {
      this.statusTextElement.textContent = statusInfo.text;
    }
    this.updateStatusIndicator(statusInfo.hasProject);
  }

  async getProjectStatus() {
    if (this.canUseChromeStorage()) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(
            ["selectedProjectId", "selectedProjectName", "user_settings"],
            (result) => {
              if (chrome.runtime?.lastError) {
                console.warn(
                  "[ToolbarController] Failed to read project from storage:",
                  chrome.runtime.lastError,
                );
                resolve({ text: "Project: Unknown", hasProject: false });
                return;
              }

              const selectedProjectId = result.selectedProjectId || null;
              const selectedProjectName = result.selectedProjectName || null;
              const projects = result.user_settings?.projects || [];
              resolve(
                this.formatProjectStatus(
                  selectedProjectId,
                  projects || [],
                  selectedProjectName,
                ),
              );
            },
          );
        } catch (error) {
          console.warn(
            "[ToolbarController] Unexpected error reading project info:",
            error,
          );
          resolve({ text: "Project: Unknown", hasProject: false });
        }
      });
    }

    // Fall back to loader bridge if chrome.storage isn't available
    this.setupProjectBridgeChannel();

    if (this.projectInfoCache) {
      return this.formatProjectStatus(
        this.projectInfoCache.selectedProjectId,
        this.projectInfoCache.projects,
        this.projectInfoCache.selectedProjectName,
      );
    }

    return await new Promise((resolve) => {
      this.projectBridgeResolvers.push(resolve);
      this.requestProjectInfoViaBridge();

      setTimeout(() => {
        const index = this.projectBridgeResolvers.indexOf(resolve);
        if (index !== -1) {
          this.projectBridgeResolvers.splice(index, 1);
          console.warn(
            "[ToolbarController] Project info bridge timeout, using fallback label",
          );
          resolve({ text: "Project: Unavailable", hasProject: false });
        }
      }, 5000);
    });
  }

  canUseChromeStorage() {
    return (
      typeof chrome !== "undefined" &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      !!chrome.storage.onChanged
    );
  }

  formatProjectStatus(
    selectedProjectId,
    projects = [],
    selectedProjectName = null,
  ) {
    let projectName = selectedProjectName || null;

    if (!projectName && selectedProjectId) {
      const match = projects.find((project) => {
        if (typeof project === "string") {
          return project === selectedProjectId;
        }

        const candidateId =
          project?.id || project?._id || project?.project_id || project?.uuid;
        return candidateId === selectedProjectId;
      });

      if (typeof match === "string") {
        projectName = match;
      } else if (match) {
        projectName =
          match.name ||
          match.title ||
          match.projectName ||
          match.label ||
          match.project_name ||
          match.id ||
          match.project_id ||
          selectedProjectId;
      }
    }

    if (projectName) {
      return { text: `Project: ${projectName}`, hasProject: true };
    }

    if (selectedProjectId) {
      return { text: `Project: ${selectedProjectId}`, hasProject: true };
    }

    return { text: "Project: Not selected", hasProject: false };
  }

  setupProjectBridgeChannel() {
    if (this.projectBridgeHandler) return;

    this.projectBridgeHandler = (event) => {
      if (event.source !== window) return;
      const message = event.data;
      if (!message || message.source !== "chatgpt-extension-response") return;

      if (
        message.type === "REQUEST_PROJECT_INFO" ||
        message.type === "PROJECT_INFO_UPDATE"
      ) {
        if (message.success === false) {
          console.warn(
            "[ToolbarController] Bridge reported error:",
            message.error,
          );
          this.bridgeRequestPending = false;
          return;
        }
        this.handleProjectInfoFromBridge(message.data || {});
      }
    };

    window.addEventListener("message", this.projectBridgeHandler);
    this.requestProjectInfoViaBridge(true);
  }

  requestProjectInfoViaBridge(force = false) {
    if (this.bridgeRequestPending && !force) {
      return;
    }
    this.bridgeRequestPending = true;

    window.postMessage(
      {
        source: "chatgpt-extension",
        type: "REQUEST_PROJECT_INFO",
      },
      "*",
    );
  }

  handleProjectInfoFromBridge(data = {}) {
    this.bridgeRequestPending = false;
    this.projectInfoCache = {
      selectedProjectId: data.selectedProjectId || null,
      selectedProjectName: data.selectedProjectName || null,
      projects: Array.isArray(data.projects) ? data.projects : [],
    };

    const status = this.formatProjectStatus(
      this.projectInfoCache.selectedProjectId,
      this.projectInfoCache.projects,
      this.projectInfoCache.selectedProjectName,
    );

    if (this.projectBridgeResolvers.length > 0) {
      const resolvers = [...this.projectBridgeResolvers];
      this.projectBridgeResolvers = [];
      resolvers.forEach((resolve) => resolve(status));
    }

    this.applyStatusInfo(status);
  }
}


