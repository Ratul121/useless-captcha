import { config } from '../config.js';
import { getSession } from './sessionService.js';
import { downloadCaptcha, solveCaptcha } from './captchaService.js';

/**
 * Normalizes input query parameters.
 */
function normalizeQuery(input) {
  return {
    board: String(input.board || 'dhaka').toLowerCase().trim(),
    exam: String(input.exam || 'ssc').toLowerCase().trim(),
    year: String(input.year || '2020').trim(),
    result_type: String(input.result_type || '1').trim(),
    roll: String(input.roll || '').trim(),
    reg: String(input.reg || '').trim(),
    eiin: input.eiin ? String(input.eiin).trim() : '',
    dcode: input.dcode ? String(input.dcode).trim() : '',
    ccode: input.ccode ? String(input.ccode).trim() : '',
  };
}

/**
 * Submits raw POST request to /v2/getres.
 */
async function postGetres(payload, session) {
  const formBody = new URLSearchParams(payload).toString();

  const response = await fetch(config.getresUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-US,en;q=0.9,bn;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'cookie': session.cookieHeader,
      'origin': config.baseUrl,
      'pragma': 'no-cache',
      'referer': config.homeUrl,
      'user-agent': session.userAgent,
      'x-requested-with': 'XMLHttpRequest',
    },
    body: formBody,
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  const isExpired =
    response.status === 419 ||
    json?.error === 'challenge_required' ||
    text.includes('Verification cookie expired') ||
    text.includes('_challenge-engine');

  return {
    status: response.status,
    isExpired,
    raw: text,
    data: json || text,
  };
}

/**
 * Fetches student examination result with automated session and CAPTCHA handling.
 * 
 * @param {Object} query - Student query params (roll, reg, board, year, exam)
 * @param {Object} [options]
 * @param {number} [options.maxAttempts=3] - Maximum retry attempts on captcha mismatch
 * @returns {Promise<Object>} Formatted result object
 */
export async function fetchResult(query, options = {}) {
  const params = normalizeQuery(query);
  const maxAttempts = options.maxAttempts || 3;

  if (!params.roll) {
    throw new Error('Roll number is required.');
  }

  console.log(`[ResultService] Starting query for Roll: ${params.roll}, Board: ${params.board}, Year: ${params.year}...`);

  let session = await getSession();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Download CAPTCHA image for the current session
    let captchaBuffer;
    try {
      captchaBuffer = await downloadCaptcha(session);
    } catch (err) {
      console.warn(`[ResultService] Error downloading captcha, refreshing session...`);
      session = await getSession(true);
      captchaBuffer = await downloadCaptcha(session);
    }

    // 2. Solve the CAPTCHA with AI vision
    let captchaCode;
    try {
      captchaCode = await solveCaptcha(captchaBuffer, options);
    } catch (err) {
      console.error(`[ResultService] Attempt ${attempt} failed to solve captcha:`, err.message);
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    // 3. Submit query
    const payload = {
      ...params,
      captcha: captchaCode,
    };

    console.log(`[ResultService] Attempt ${attempt}: Submitting with CAPTCHA: ${captchaCode}...`);
    let result = await postGetres(payload, session);

    // 4. Handle expired session
    if (result.isExpired) {
      console.log('[ResultService] Session expired (HTTP 419). Refreshing session via headless browser...');
      session = await getSession(true); // Force re-verification
      result = await postGetres(payload, session);
    }

    const data = result.data;

    // Check if result found
    if (data?.status === 0 && data?.res) {
      console.log('[ResultService] Result successfully retrieved!');
      return {
        success: true,
        message: data.msg || 'Success',
        student: data.res,
        subjects: data.sub_details || [],
        raw: data,
      };
    }

    // Check if error is due to captcha mismatch
    if (data?.msg && data.msg.toLowerCase().includes('captcha')) {
      console.warn(`[ResultService] CAPTCHA ${captchaCode} rejected by server. Retrying with fresh CAPTCHA...`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }

    // Other messages from the board (e.g. "Result not found", "Incorrect registration number")
    return {
      success: false,
      message: data?.msg || 'Could not find result',
      raw: data,
    };
  }

  throw new Error(`Failed to solve CAPTCHA after ${maxAttempts} attempts.`);
}
