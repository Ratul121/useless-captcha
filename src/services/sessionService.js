import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { config } from '../config.js';

let activeSession = null;
let refreshPromise = null; // Prevents concurrent duplicate browser launches

/**
 * Extracts expiration timestamp from human_session string.
 * Format: "1791742407|hash"
 */
function parseExpiry(humanSessionValue) {
  if (!humanSessionValue) return 0;
  const ts = parseInt(humanSessionValue.split('|')[0], 10);
  return isNaN(ts) ? 0 : ts;
}

/**
 * Reads session from disk if valid and unexpired.
 */
async function readSavedSession() {
  try {
    const raw = await fs.readFile(config.sessionFilePath, 'utf-8');
    const data = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);

    // Give a 30-second buffer before expiry
    if (data.expiresAt && data.expiresAt <= now + 30) {
      console.log(`[SessionService] Cached session expired at ${new Date(data.expiresAt * 1000).toISOString()}`);
      return null;
    }

    if (!data.cookieHeader || !data.cookies?.human_session) {
      return null;
    }

    return data;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[SessionService] Warning reading session file:', err.message);
    }
    return null;
  }
}

/**
 * Launches headless Puppeteer to pass challenge-engine and extract fresh cookies.
 */
async function launchAndAcquireSession() {
  console.log('[SessionService] Launching headless browser for verification...');
  const browser = await puppeteer.launch({
    headless: true,
    args: config.puppeteerArgs,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(config.defaultUserAgent);

    console.log(`[SessionService] Navigating to challenge engine...`);
    await page.goto(config.challengeUrl, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    }).catch(e => console.log('[SessionService] Goto note:', e.message));

    // Wait until navigated to /v2/home and both cookies exist
    for (let i = 0; i < 15; i++) {
      const url = page.url();
      const cookies = await page.cookies();
      const hasHumanSession = cookies.some(c => c.name === 'human_session');
      const hasEbrSessId = cookies.some(c => c.name === 'EBRSESSID2');

      if (url.includes('/v2/home') && hasHumanSession && hasEbrSessId) {
        break;
      }

      if (hasHumanSession && !url.includes('/v2/home')) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!page.url().includes('/v2/home')) {
      await page.goto(config.homeUrl, { waitUntil: 'networkidle2' }).catch(() => {});
    }

    const cookiesList = await page.cookies();
    const cookiesObj = {};
    const cookieStrings = [];

    for (const c of cookiesList) {
      cookiesObj[c.name] = c.value;
      cookieStrings.push(`${c.name}=${c.value}`);
    }

    const humanSessionValue = cookiesObj['human_session'];
    const expiresAt = parseExpiry(humanSessionValue);

    const sessionData = {
      updatedAt: new Date().toISOString(),
      expiresAt,
      userAgent: config.defaultUserAgent,
      cookies: cookiesObj,
      cookieHeader: cookieStrings.join('; '),
    };

    await fs.writeFile(config.sessionFilePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    console.log(`[SessionService] Fresh session saved (valid until ${new Date(expiresAt * 1000).toISOString()}).`);

    activeSession = sessionData;
    return sessionData;
  } finally {
    await browser.close();
  }
}

/**
 * Returns a valid session, refreshing only when necessary.
 * Concurrency-safe: multiple callers await the same refresh operation.
 */
export async function getSession(forceRefresh = false) {
  if (!forceRefresh) {
    if (activeSession) {
      const now = Math.floor(Date.now() / 1000);
      if (!activeSession.expiresAt || activeSession.expiresAt > now + 30) {
        return activeSession;
      }
    }

    const diskSession = await readSavedSession();
    if (diskSession) {
      activeSession = diskSession;
      return diskSession;
    }
  }

  // Ensure only one browser launch occurs at a time
  if (!refreshPromise) {
    refreshPromise = launchAndAcquireSession().finally(() => {
      refreshPromise = null;
    });
  }

  return await refreshPromise;
}

/**
 * Checks session health / remaining seconds.
 */
export async function getSessionStatus() {
  const session = await readSavedSession();
  if (!session) return { valid: false, remainingSeconds: 0 };
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, (session.expiresAt || 0) - now);
  return {
    valid: remaining > 30,
    expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    remainingSeconds: remaining,
    updatedAt: session.updatedAt,
  };
}
