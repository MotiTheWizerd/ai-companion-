/**
 * Central registry for AI providers
 * Singleton pattern for global access
 */
export class ProviderRegistry {
  static instance = null;

  constructor() {
    if (ProviderRegistry.instance) {
      return ProviderRegistry.instance;
    }

    this.providers = new Map();
    this.activeProvider = null;
    ProviderRegistry.instance = this;
  }

  static getInstance() {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider
   * @param {BaseProvider} provider
   */
  register(provider) {
    const name = provider.getName();
    this.providers.set(name, provider);
    console.log(`[ProviderRegistry] Registered provider: ${name}`);
  }

  /**
   * Detect and set active provider based on current URL
   */
  detectActiveProvider() {
    const currentURL = window.location.href;

    for (const [name, provider] of this.providers) {
      if (provider.getURLMatcher().matchesDomain(currentURL)) {
        this.activeProvider = provider;
        console.log(`[ProviderRegistry] Active provider: ${name}`);
        return provider;
      }
    }

    console.warn('[ProviderRegistry] No matching provider found for:', currentURL);
    return null;
  }

  /**
   * Get active provider
   * @returns {BaseProvider|null}
   */
  getActiveProvider() {
    if (!this.activeProvider) {
      this.detectActiveProvider();
    }
    return this.activeProvider;
  }

  /**
   * Get provider by name
   * @param {string} name
   * @returns {BaseProvider|undefined}
   */
  getProvider(name) {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   * @returns {Array<BaseProvider>}
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }
}
