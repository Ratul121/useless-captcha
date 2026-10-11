# Distorted CAPTCHAs Are Obsolete

> A security research case study: off-the-shelf multimodal AI solves distorted-digit CAPTCHAs in ~2 seconds.

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## TL;DR

Public portals (including education board sites) still use warped 4-digit image CAPTCHAs. Modern vision models read them with one short prompt and no training:

```
Distorted JPEG ──► Vision model ──► "8119" (~1.2s)
```

Prompt used: *"what are the 4 digits written on paper from left to right? there are exactly 4 digits. only answer in digits. nothing else"*

## Why It Matters

- **Bots win, humans lose:** accessibility problems, mistyped digits on mobile, and frustration during traffic spikes.
- **Server cost, no protection:** generating images per visitor burns CPU and session state.
- **Near-zero attack cost:** \~200 input + \~10 output tokens per solve with `google/gemma-4-26b-a4b-it` means **\~$0.106 per 10,000 solves**, versus $1–3 per 1,000 for human solving farms.

## Benchmark

10 live CAPTCHAs, `google/gemma-4-26b-a4b-it` via OpenRouter:

| Metric | Result |
| :--- | :--- |
| Success rate | **10/10 (100%)** |
| Avg AI solve time | **2.03s** |
| Fastest / slowest | 0.92s / 3.78s |
| Avg end-to-end | 2.35s |

Reproduce: `npm run benchmark`

## How It Works

1. Puppeteer passes the basic challenge and saves session cookies.
2. Fetch the CAPTCHA JPEG from `/v2/captcha`.
3. Send it to a vision model and get the 4 digits back.
4. Submit the code to `/v2/getres` and read the result.

## Quick Start

**Requirements:** Node.js v20+ and an [OpenRouter](https://openrouter.ai/) or [Google AI Studio](https://aistudio.google.com/) API key.

```bash
git clone https://github.com/Ratul121/useless-captcha.git
cd useless-captcha
npm install
cp .env.example .env
```

`.env`:
```ini
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it
# Optional Gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemma-4-26b-a4b-it
CAPTCHA_PROVIDER=openrouter
PORT=3000
```

**CLI:**
```bash
node src/cli.js 100001 1234567890 dhaka 2024 ssc
```

**REST server:**
```bash
npm start
curl "http://localhost:3000/api/result?roll=100001&reg=1234567890&board=dhaka&year=2024&exam=ssc"
```

## What to Use Instead

| Replace | With | Why |
| :--- | :--- | :--- |
| Distorted image digits | reCAPTCHA v3 / Cloudflare Turnstile | Background scoring; real users rarely see a puzzle |
| Session-locked JPEGs | Bot management + rate limiting | Blocks bulk traffic at the edge |
| No public API | Official rate-limited JSON API | Legitimate access path, less scraping |

No single control is perfect. Combine bot detection with rate limiting.

## ⚖️ Notice

- **Educational and security research use only.** Bangladesh education board data is used purely as a demonstration. Do not misuse it.
- Not affiliated with the Bangladesh Ministry of Education, NCTB, or any exam board.
- Written on **12 October 2026**; the target site may change and break this demo at any time.
- Do not use for unauthorized mass extraction, denial of service, or commercial purposes.

## License

[MIT](LICENSE)