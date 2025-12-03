import { eventBus } from "../../content/core/eventBus.js";
import { RetryManager } from "./utils/RetryManager.js";

/**
 * Controls the injection and management of the toolbar.
 * The toolbar is injected into the <body> element and positioned fixed at the top center.
 */
export class ToolbarController {
  constructor(conversationManager, chatHistoryManager) {
    this.conversationManager = conversationManager;
    this.chatHistoryManager = chatHistoryManager;
    this.isInitialized = false;
    this.toolbarElement = null;
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
    this.retryManager = new RetryManager();
    this.lifecycleHandlers = null;
  }

  init() {
    if (this.isInitialized) return;
    this.logDebug("init");

    if (this.chatHistoryManager) {
      this.chatHistoryManager.onConversationCaptured(() => {
        this.logDebug("conversation:captured");
        this.showSettingsIcon();
      });
    }

    this.registerLifecycleListeners();
    this.registerStorageListener();
    this.tryInjectWithRetry("init");
    this.isInitialized = true;
  }

  registerLifecycleListeners() {
    if (this.lifecycleHandlers) return;
    this.lifecycleHandlers = {
      domReady: (detail) => this.handleDomReady(detail),
      hostMutation: (detail) => this.handleHostMutation(detail),
      navigation: (detail) => this.handleNavigation(detail),
    };
    eventBus.on("lifecycle:dom-ready", this.lifecycleHandlers.domReady);
    eventBus.on("lifecycle:host-mutation", this.lifecycleHandlers.hostMutation);
    eventBus.on("lifecycle:navigation", this.lifecycleHandlers.navigation);
  }

  handleDomReady(detail) {
    this.logDebug("lifecycle:dom-ready", { detail });
    this.tryInjectWithRetry("dom-ready");
  }

  handleHostMutation(detail) {
    this.logDebug("lifecycle:host-mutation", { detail });
    if (this.toolbarElement && document.body.contains(this.toolbarElement)) {
      return;
    }
    this.tryInjectWithRetry("host-mutation");
  }

  handleNavigation(detail) {
    this.logDebug("lifecycle:navigation", { detail });
    this.destroyToolbar();
    this.tryInjectWithRetry("navigation");
  }

  tryInjectWithRetry(reason = "manual") {
    this.logDebug("attempt:start", { detail: { reason } });
    const injected = this.attemptInjection();
    if (injected) {
      this.retryManager.cancel();
      this.logDebug("attempt:success", { detail: { reason } });
      return true;
    }
    this.logDebug("attempt:pending", { detail: { reason } });
    this.retryManager.schedule(() => this.tryInjectWithRetry("retry"));
    return false;
  }

  attemptInjection() {
    if (!document.body) {
      this.logDebug("attempt:blocked", { detail: { reason: "no-body" } });
      return false;
    }

    if (this.toolbarElement) {
      if (document.body.contains(this.toolbarElement)) {
        this.logDebug("attempt:skipped", {
          detail: { reason: "already-present" },
        });
        return true;
      }
      this.toolbarElement = null;
    }

    const selectors = this.conversationManager?.getSelectors();
    if (!selectors) {
      this.logDebug("attempt:blocked", { detail: { reason: "no-selectors" } });
      return false;
    }

    const toolbarSelector = selectors.getToolbar?.();
    if (!toolbarSelector) {
      this.logDebug("attempt:blocked", { detail: { reason: "no-selector" } });
      return false;
    }

    const position = selectors.getToolbarPosition
      ? selectors.getToolbarPosition()
      : "append";
    const parentLevels = selectors.provider?.getParentLevels
      ? selectors.provider.getParentLevels()
      : 0;

    let targetElement = null;
    try {
      targetElement = document.querySelector(toolbarSelector);
    } catch (error) {
      console.warn(
        "[ToolbarController] Invalid toolbar selector:",
        toolbarSelector,
        error,
      );
      this.logDebug("attempt:error", { detail: { reason: "invalid-selector" } });
      return false;
    }

    for (let i = 0; i < parentLevels && targetElement; i++) {
      targetElement = targetElement.parentElement;
    }

    const existingToolbar = document.querySelector(".semantix-header-toolbar");
    if (existingToolbar) {
      this.toolbarElement = existingToolbar;
      this.statusTextElement = existingToolbar.querySelector(
        ".semantix-status-text",
      );
      this.statusDotElement = existingToolbar.querySelector(
        ".semantix-status-dot",
      );
      this.logDebug("attempt:attached-existing");
      return true;
    }

    if (!targetElement) {
      this.logDebug("attempt:waiting", { detail: { reason: "target-missing" } });
      return false;
    }

    return this.injectToolbar(targetElement, position);
  }

  injectToolbar(targetElement, position) {
    const toolbarHtml = this.getHeaderToolbarHTML(false);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = toolbarHtml;
    const toolbarElement = tempDiv.firstElementChild;

    if (!toolbarElement) {
      this.logDebug("attempt:error", { detail: { reason: "template-failed" } });
      return false;
    }

    this.toolbarElement = toolbarElement;
    this.statusTextElement = toolbarElement.querySelector(
      ".semantix-status-text",
    );
    this.statusDotElement = toolbarElement.querySelector(
      ".semantix-status-dot",
    );
    this.updateStatusIndicator(false);
    this.refreshProjectStatusText();

    if (position === "after") {
      targetElement.parentNode.insertBefore(
        toolbarElement,
        targetElement.nextSibling,
      );
    } else if (position === "before") {
      targetElement.parentNode.insertBefore(toolbarElement, targetElement);
    } else if (position === "prepend") {
      targetElement.insertBefore(toolbarElement, targetElement.firstChild);
    } else {
      targetElement.appendChild(toolbarElement);
    }

    this.logDebug("attempt:injected", { detail: { position } });
    return true;
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
                    <span class="semantix-settings-icon">�sT�,?</span>
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
    this.logDebug("settings:show");

    if (this.toolbarElement) {
      if (this.statusTextElement) {
        this.statusTextElement.classList.add("active");
        this.statusTextElement.textContent = this.projectDisplayText;
        this.statusTextElement.className = "semantix-status-text active";
      }
      this.updateStatusIndicator(this.hasProjectSelected);

      const existingIcon = this.toolbarElement.querySelector(
        ".semantix-settings-icon",
      );
      if (existingIcon) {
        this.logDebug("settings:exists");
        return;
      }

      const settingsIcon = document.createElement("span");
      settingsIcon.className = "semantix-settings-icon";
      settingsIcon.textContent = "�sT�,?";

      settingsIcon.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.logDebug("settings:click");
        this.openSettings();
      });

      this.toolbarElement.appendChild(settingsIcon);
      this.logDebug("settings:added");
    }
  }

  openSettings() {
    this.logDebug("settings:open");

    try {
      eventBus.emit("import:chat", { source: "toolbar-settings" });
      this.logDebug("settings:event-emitted");
    } catch (err) {
      console.error("[ToolbarController] Failed to emit import:chat event", err);
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
        this.logDebug("storage:update");
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
          this.bridgeRequestPending = false;
          resolve({ text: "Project: Unavailable", hasProject: false });
          // Schedule another request in case the bridge becomes available later
          setTimeout(() => this.requestProjectInfoViaBridge(true), 1000);
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

  destroyToolbar() {
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.remove();
    }
    this.toolbarElement = null;
    this.statusTextElement = null;
    this.statusDotElement = null;
    this.retryManager.cancel();
  }

  logDebug(stage, detail = {}) {
    eventBus.emit("debug:toolbar", { stage, detail });
  }
}
