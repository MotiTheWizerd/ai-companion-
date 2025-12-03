import { eventBus } from "../../content/core/eventBus.js";
import { RetryManager } from "./utils/RetryManager.js";
import { APIClient } from "../APIClient/index.js";
import { RequestBuilder } from "../APIClient/endpoints/factories/index.js";
import { USER_CONFIG, API_CONFIG } from "../../configuration/index.js";
import { EVENTS } from "../../content/core/constants.js";

/**
 * Controls the injection and management of the toolbar.
 * The toolbar is injected into the <body> element and positioned fixed at the top center.
 * Now includes a project dropdown selector.
 */
export class ToolbarController {
  constructor(conversationManager, chatHistoryManager) {
    this.conversationManager = conversationManager;
    this.chatHistoryManager = chatHistoryManager;
    this.isInitialized = false;
    this.toolbarElement = null;
    this.statusDotElement = null;
    this.projectDropdownElement = null;
    this.hasProjectSelected = false;
    this.storageListener = null;
    this.projectInfoCache = null;
    this.projectBridgeResolvers = [];
    this.bridgeRequestPending = false;
    this.projectBridgeHandler = null;
    this.storageWarningLogged = false;
    this.retryManager = new RetryManager();
    this.lifecycleHandlers = null;

    // API Client for fetching projects
    this.apiClient = null;
    this.projectsRequestId = null;
    this.projects = [];
    this.selectedProjectId = "";
    this.isLoadingProjects = false;
  }

  init() {
    if (this.isInitialized) return;
    this.logDebug("init");

    // Initialize API Client
    this.initAPIClient();

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

  initAPIClient() {
    this.apiClient = new APIClient({
      baseURL: API_CONFIG.BASE_URL,
    });
    this.apiClient.init();

    // Setup event listeners for API responses
    eventBus.on(EVENTS.API_REQUEST_SUCCESS, (data) =>
      this.handleApiSuccess(data),
    );
    eventBus.on(EVENTS.API_REQUEST_FAILED, (data) =>
      this.handleApiFailure(data),
    );

    // Load cached projects and selected project from storage, then fetch fresh data
    this.loadProjectsFromStorage();
  }

  handleApiSuccess(data) {
    if (data.requestId !== this.projectsRequestId) return;

    this.logDebug("api:projects-success", { data });

    const response = data.response;
    let projectList = [];

    if (Array.isArray(response)) {
      projectList = response;
    } else if (response && Array.isArray(response.data)) {
      projectList = response.data;
    } else if (
      response &&
      response.projects &&
      Array.isArray(response.projects)
    ) {
      projectList = response.projects;
    }

    this.projects = projectList;
    this.isLoadingProjects = false;
    this.updateDropdownOptions();

    // Cache projects to storage
    this.cacheProjectsToStorage(projectList);
  }

  handleApiFailure(data) {
    if (data.requestId !== this.projectsRequestId) return;

    console.error("[ToolbarController] Failed to fetch projects:", data.error);
    this.isLoadingProjects = false;
    this.updateDropdownOptions();
  }

  loadProjectsFromStorage() {
    if (!this.canUseChromeStorage()) {
      this.fetchProjectsFromServer();
      return;
    }

    try {
      chrome.storage.local.get(
        ["selectedProjectId", "user_settings"],
        (result) => {
          if (chrome.runtime?.lastError) {
            console.warn(
              "[ToolbarController] Error loading from storage:",
              chrome.runtime.lastError,
            );
            this.fetchProjectsFromServer();
            return;
          }

          // Load selected project
          if (result.selectedProjectId) {
            this.selectedProjectId = result.selectedProjectId;
            this.logDebug("storage:loaded-selected", {
              id: result.selectedProjectId,
            });
          }

          // Load cached projects
          const cachedProjects = result.user_settings?.projects;
          if (
            cachedProjects &&
            Array.isArray(cachedProjects) &&
            cachedProjects.length > 0
          ) {
            this.projects = cachedProjects;
            this.logDebug("storage:loaded-cached-projects", {
              count: cachedProjects.length,
            });
            this.updateDropdownOptions();
          }

          // Always fetch fresh data
          this.fetchProjectsFromServer();
        },
      );
    } catch (error) {
      console.error(
        "[ToolbarController] Failed to access chrome.storage:",
        error,
      );
      this.fetchProjectsFromServer();
    }
  }

  fetchProjectsFromServer() {
    if (!USER_CONFIG.USER_ID) {
      console.warn("[ToolbarController] No User ID found in configuration");
      return;
    }

    this.isLoadingProjects = true;
    this.updateDropdownOptions();

    const request = RequestBuilder.getProjectsByUser(USER_CONFIG.USER_ID);
    this.projectsRequestId = this.apiClient.enqueueRequest(request);
    this.logDebug("api:fetching-projects", {
      requestId: this.projectsRequestId,
    });
  }

  cacheProjectsToStorage(projectList) {
    if (!this.canUseChromeStorage()) return;

    try {
      chrome.storage.local.get(["user_settings"], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn(
            "[ToolbarController] Error accessing storage for cache:",
            chrome.runtime.lastError,
          );
          return;
        }

        const userSettings = result.user_settings || {};
        userSettings.projects = projectList;

        chrome.storage.local.set({ user_settings: userSettings }, () => {
          if (chrome.runtime?.lastError) {
            console.warn(
              "[ToolbarController] Error saving projects cache:",
              chrome.runtime.lastError,
            );
          } else {
            this.logDebug("storage:cached-projects", {
              count: projectList.length,
            });
          }
        });
      });
    } catch (error) {
      console.warn("[ToolbarController] Failed to cache projects:", error);
    }
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
      this.logDebug("attempt:error", {
        detail: { reason: "invalid-selector" },
      });
      return false;
    }

    for (let i = 0; i < parentLevels && targetElement; i++) {
      targetElement = targetElement.parentElement;
    }

    const existingToolbar = document.querySelector(".semantix-header-toolbar");
    if (existingToolbar) {
      this.toolbarElement = existingToolbar;
      this.statusDotElement = existingToolbar.querySelector(
        ".semantix-status-dot",
      );
      this.projectDropdownElement = existingToolbar.querySelector(
        ".semantix-project-dropdown",
      );
      this.logDebug("attempt:attached-existing");
      this.updateDropdownOptions();
      return true;
    }

    if (!targetElement) {
      this.logDebug("attempt:waiting", {
        detail: { reason: "target-missing" },
      });
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
    this.statusDotElement = toolbarElement.querySelector(
      ".semantix-status-dot",
    );
    this.projectDropdownElement = toolbarElement.querySelector(
      ".semantix-project-dropdown",
    );

    // Attach event listener to dropdown
    if (this.projectDropdownElement) {
      this.projectDropdownElement.addEventListener("change", (e) =>
        this.handleProjectChange(e),
      );
    }

    this.updateStatusIndicator(this.hasProjectSelected);
    this.updateDropdownOptions();

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

  handleProjectChange(e) {
    const newValue = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];
    const selectedLabel = selectedOption
      ? selectedOption.textContent.trim()
      : "";

    this.logDebug("project:changed", { id: newValue, name: selectedLabel });
    this.selectedProjectId = newValue;
    this.hasProjectSelected = !!newValue;
    this.updateStatusIndicator(this.hasProjectSelected);

    const payload = {
      selectedProjectId: newValue || null,
      selectedProjectName: newValue ? selectedLabel || newValue : null,
    };

    // Save to chrome.storage
    if (this.canUseChromeStorage()) {
      try {
        chrome.storage.local.set(payload, () => {
          if (chrome.runtime?.lastError) {
            console.error(
              "[ToolbarController] Error saving selected project:",
              chrome.runtime.lastError,
            );
          } else {
            this.logDebug("storage:saved-selection", payload);
          }
        });
      } catch (error) {
        console.error(
          "[ToolbarController] Failed to save selected project:",
          error,
        );
      }
    }
  }

  updateDropdownOptions() {
    if (!this.projectDropdownElement) return;

    // Preserve current selection
    const currentValue = this.selectedProjectId;

    // Clear existing options except the first placeholder
    while (this.projectDropdownElement.options.length > 1) {
      this.projectDropdownElement.remove(1);
    }

    // Update placeholder text
    const placeholderOption = this.projectDropdownElement.options[0];
    if (placeholderOption) {
      placeholderOption.textContent = this.isLoadingProjects
        ? "Loading..."
        : "Select project...";
    }

    // Add project options
    this.projects.forEach((project) => {
      const option = document.createElement("option");

      if (typeof project === "string") {
        option.value = project;
        option.textContent = project;
      } else {
        const id =
          project.id || project._id || project.project_id || project.uuid;
        const name =
          project.name ||
          project.title ||
          project.projectName ||
          project.label ||
          project.project_name ||
          id;
        option.value = id;
        option.textContent = name;
      }

      this.projectDropdownElement.appendChild(option);
    });

    // Restore selection
    if (currentValue) {
      this.projectDropdownElement.value = currentValue;
      this.hasProjectSelected = true;
    }

    this.updateStatusIndicator(this.hasProjectSelected);
    this.projectDropdownElement.disabled = this.isLoadingProjects;
  }

  /**
   * Get HTML for the header toolbar
   * @param {boolean} showSettingsIcon - Whether to include the settings icon
   * @returns {string} HTML string for the toolbar
   */
  getHeaderToolbarHTML(showSettingsIcon) {
    const settingsIconHtml = showSettingsIcon
      ? `<span class="semantix-settings-icon">⚙️</span>`
      : "";

    return `
      <div class='semantix-header-toolbar'>
        <span class="semantix-status-dot offline"></span>
        <select class="semantix-project-dropdown" ${this.isLoadingProjects ? "disabled" : ""}>
          <option value="">${this.isLoadingProjects ? "Loading..." : "Select project..."}</option>
        </select>
        ${settingsIconHtml}
      </div>
    `;
  }

  /**
   * Show the settings icon in the toolbar after conversation is captured
   */
  showSettingsIcon() {
    this.logDebug("settings:show");

    if (this.toolbarElement) {
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
      settingsIcon.textContent = "⚙️";

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

      // Handle external changes to selected project (e.g., from popup)
      if (changes.selectedProjectId) {
        const newValue = changes.selectedProjectId.newValue || "";
        if (newValue !== this.selectedProjectId) {
          this.selectedProjectId = newValue;
          this.hasProjectSelected = !!newValue;
          if (this.projectDropdownElement) {
            this.projectDropdownElement.value = newValue;
          }
          this.updateStatusIndicator(this.hasProjectSelected);
          this.logDebug("storage:external-update", { id: newValue });
        }
      }

      // Handle external changes to projects list
      if (changes.user_settings) {
        const newProjects = changes.user_settings.newValue?.projects;
        if (newProjects && Array.isArray(newProjects)) {
          this.projects = newProjects;
          this.updateDropdownOptions();
          this.logDebug("storage:projects-updated", {
            count: newProjects.length,
          });
        }
      }
    };

    chrome.storage.onChanged.addListener(this.storageListener);
  }

  updateStatusIndicator(hasProject) {
    if (!this.statusDotElement) return;
    this.statusDotElement.classList.toggle("online", hasProject);
    this.statusDotElement.classList.toggle("offline", !hasProject);
  }

  canUseChromeStorage() {
    return (
      typeof chrome !== "undefined" &&
      !!chrome.storage &&
      !!chrome.storage.local &&
      !!chrome.storage.onChanged
    );
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

    if (data.selectedProjectId) {
      this.selectedProjectId = data.selectedProjectId;
      this.hasProjectSelected = true;
    }

    if (Array.isArray(data.projects) && data.projects.length > 0) {
      this.projects = data.projects;
    }

    this.updateDropdownOptions();
    this.updateStatusIndicator(this.hasProjectSelected);

    // Resolve any pending promises
    if (this.projectBridgeResolvers.length > 0) {
      const resolvers = [...this.projectBridgeResolvers];
      this.projectBridgeResolvers = [];
      resolvers.forEach((resolve) =>
        resolve({
          selectedProjectId: this.selectedProjectId,
          projects: this.projects,
        }),
      );
    }
  }

  destroyToolbar() {
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.remove();
    }
    this.toolbarElement = null;
    this.statusDotElement = null;
    this.projectDropdownElement = null;
    this.retryManager.cancel();
  }

  destroy() {
    this.destroyToolbar();

    // Clean up API client
    if (this.apiClient) {
      this.apiClient.destroy();
      this.apiClient = null;
    }

    // Clean up storage listener
    if (this.storageListener && this.canUseChromeStorage()) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }

    // Clean up bridge handler
    if (this.projectBridgeHandler) {
      window.removeEventListener("message", this.projectBridgeHandler);
      this.projectBridgeHandler = null;
    }

    // Clean up lifecycle handlers
    if (this.lifecycleHandlers) {
      eventBus.off("lifecycle:dom-ready", this.lifecycleHandlers.domReady);
      eventBus.off(
        "lifecycle:host-mutation",
        this.lifecycleHandlers.hostMutation,
      );
      eventBus.off("lifecycle:navigation", this.lifecycleHandlers.navigation);
      this.lifecycleHandlers = null;
    }

    // Clean up API event listeners
    eventBus.off(EVENTS.API_REQUEST_SUCCESS, this.handleApiSuccess);
    eventBus.off(EVENTS.API_REQUEST_FAILED, this.handleApiFailure);

    this.isInitialized = false;
  }

  logDebug(stage, detail = {}) {
    eventBus.emit("debug:toolbar", { stage, detail });
  }
}
