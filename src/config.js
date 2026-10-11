import path from 'path';

// Automatically load .env if available
try {
  process.loadEnvFile?.('.env');
} catch {}

const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
const hasGemini = Boolean(process.env.GEMINI_API_KEY);

// Determine default provider: user explicit > openrouter (if key exists) > gemini
let defaultProvider = 'gemini';
if (process.env.CAPTCHA_PROVIDER) {
  defaultProvider = process.env.CAPTCHA_PROVIDER.toLowerCase();
} else if (hasOpenRouter) {
  defaultProvider = 'openrouter';
} else if (hasGemini) {
  defaultProvider = 'gemini';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  sessionFilePath: path.resolve(process.env.SESSION_FILE || 'session.json'),
  
  // Education board URLs
  baseUrl: 'https://www.educationboardresults.gov.bd',
  challengeUrl: 'https://www.educationboardresults.gov.bd/_challenge-engine?goto=%2Fv2%2Fhome',
  homeUrl: 'https://www.educationboardresults.gov.bd/v2/home',
  getresUrl: 'https://www.educationboardresults.gov.bd/v2/getres',
  captchaUrl: 'https://www.educationboardresults.gov.bd/v2/captcha',

  // Provider selection: 'openrouter' | 'gemini' | 'auto'
  captchaProvider: defaultProvider,

  // OpenRouter configuration
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it',
  openrouterEndpoint: 'https://openrouter.ai/api/v1/chat/completions',

  // Google Generative Language configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || process.env.MODEL_ID || 'gemma-4-26b-a4b-it',
  apiType: process.env.GENERATE_CONTENT_API || 'streamGenerateContent',

  ocrPrompt: 'what are the 4 digits written on paper from left to right? there are exactly 4 digits. only answer in digits. nothing else',

  // Puppeteer flags optimized for Ubuntu VPS / Headless environments
  puppeteerArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--disable-blink-features=AutomationControlled',
  ],
  defaultUserAgent: 'Mozilla/5.0 (X507; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};
