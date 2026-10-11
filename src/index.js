import { startServer, createApp } from './server.js';
import { fetchResult } from './services/resultService.js';
import { getSession, getSessionStatus } from './services/sessionService.js';
import { downloadCaptcha, solveCaptcha } from './services/captchaService.js';

export {
  createApp,
  startServer,
  fetchResult,
  getSession,
  getSessionStatus,
  downloadCaptcha,
  solveCaptcha,
};

// Default execution launches server
if (process.argv[1]?.endsWith('index.js')) {
  startServer();
}
