import { config } from '../config.js';

/**
 * Downloads a fresh CAPTCHA image using the active session cookies.
 */
export async function downloadCaptcha(session) {
  const response = await fetch(config.captchaUrl, {
    headers: {
      cookie: session.cookieHeader,
      referer: config.homeUrl,
      'user-agent': session.userAgent,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download captcha image: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Solves using OpenRouter API.
 */
async function solveWithOpenRouter(imageBuffer, options = {}) {
  const apiKey = options.apiKey || config.openrouterApiKey;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined.');
  }

  const model = options.model || config.openrouterModel;
  const promptText = options.prompt || config.ocrPrompt;
  const base64Data = imageBuffer.toString('base64');

  const maxRetries = options.maxRetries ?? 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(config.openrouterEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'nctb-result',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                  },
                },
                {
                  type: 'text',
                  text: promptText,
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isTransient = response.status === 429 || response.status >= 500;
        if (isTransient && attempt < maxRetries) {
          console.warn(`[CaptchaService-OpenRouter] HTTP ${response.status}. Retrying in ${attempt * 1500}ms...`);
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }
        throw new Error(`OpenRouter API Error (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';

      const match = content.match(/\b\d{4}\b/) || content.match(/\d{4}/);
      if (!match) {
        throw new Error(`Could not extract 4 digits from OpenRouter response: "${content.trim()}"`);
      }

      const digits = match[0];
      console.log(`[CaptchaService] Solved digits: ${digits} (Provider: OpenRouter, Model: ${model})`);
      return digits;

    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to solve via OpenRouter.');
}

/**
 * Solves using Google Gemini / Generative Language API.
 */
async function solveWithGemini(imageBuffer, options = {}) {
  const apiKey = options.apiKey || config.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined.');
  }

  let model = options.model || config.geminiModel;
  const apiType = options.apiType || config.apiType;
  const promptText = options.prompt || config.ocrPrompt;
  const maxRetries = options.maxRetries ?? 3;
  const fallbackOn500 = options.fallbackOn500 ?? true;
  const base64Data = imageBuffer.toString('base64');

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
  };

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${apiType}?key=${apiKey}`;

    // Only models like gemma-4 require thinkingConfig with minimal level
    const currentPayload = {
      ...requestBody,
      ...(model.toLowerCase().includes('gemma') ? {
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: 'MINIMAL',
          },
        },
      } : {}),
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isTransient = response.status === 500 || response.status === 503 || response.status === 502;

        if (isTransient) {
          console.warn(`[CaptchaService-Gemini] Transient HTTP ${response.status} on ${model} (attempt ${attempt}/${maxRetries}).`);

          if (attempt < maxRetries) {
            const delay = attempt * 1500;
            console.log(`[CaptchaService-Gemini] Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          } else if (fallbackOn500 && model === 'gemma-4-26b-a4b-it') {
            console.warn('[CaptchaService-Gemini] Falling back to gemini-2.5-flash due to repeated 500s on Gemma...');
            model = 'gemini-2.5-flash';
            attempt = 0;
            continue;
          }
        }

        throw new Error(`Google API Error (HTTP ${response.status}): ${errorText}`);
      }

      const rawJson = await response.json();
      let text = '';
      const chunks = Array.isArray(rawJson) ? rawJson : [rawJson];

      for (const chunk of chunks) {
        for (const part of chunk?.candidates?.[0]?.content?.parts || []) {
          if (part.text && !part.thought) {
            text += part.text;
          }
        }
      }

      const match = text.match(/\b\d{4}\b/) || text.match(/\d{4}/);
      if (!match) {
        throw new Error(`Could not extract 4 digits from model response: "${text.trim()}"`);
      }

      const digits = match[0];
      console.log(`[CaptchaService] Solved digits: ${digits} (Provider: Google, Model: ${model})`);
      return digits;

    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && err.message.includes('HTTP 500')) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      } else {
        throw err;
      }
    }
  }

  throw lastError || new Error('Failed to solve via Gemini.');
}

/**
 * Main solver entrypoint: routes to OpenRouter or Gemini based on config and environment.
 */
export async function solveCaptcha(imageBuffer, options = {}) {
  const provider = (options.provider || config.captchaProvider || 'openrouter').toLowerCase();

  // If provider is OpenRouter
  if (provider === 'openrouter') {
    try {
      return await solveWithOpenRouter(imageBuffer, options);
    } catch (err) {
      if (config.geminiApiKey) {
        console.warn(`[CaptchaService] OpenRouter failed (${err.message}). Trying Gemini fallback...`);
        return await solveWithGemini(imageBuffer, options);
      }
      throw err;
    }
  }

  // If provider is Gemini
  if (provider === 'gemini') {
    try {
      return await solveWithGemini(imageBuffer, options);
    } catch (err) {
      if (config.openrouterApiKey) {
        console.warn(`[CaptchaService] Gemini failed (${err.message}). Trying OpenRouter fallback...`);
        return await solveWithOpenRouter(imageBuffer, options);
      }
      throw err;
    }
  }

  // Auto mode: prioritize what is present in environment
  if (config.openrouterApiKey) {
    try {
      return await solveWithOpenRouter(imageBuffer, options);
    } catch (err) {
      if (config.geminiApiKey) {
        return await solveWithGemini(imageBuffer, options);
      }
      throw err;
    }
  }

  if (config.geminiApiKey) {
    return await solveWithGemini(imageBuffer, options);
  }

  throw new Error('No API key provided. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env.');
}
