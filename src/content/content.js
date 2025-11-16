/**
 * Main entry point for ChatGPT extension
 * Minimal bootstrap - delegates to Application orchestrator
 */
import { Application } from './core/Application.js';

// Initialize and start application
new Application().init();
