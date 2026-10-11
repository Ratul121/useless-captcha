# Why Legacy Distorted CAPTCHAs Are Obsolete in the Age of Multimodal AI

> **A Technical Demonstration & Security Research Case Study**  
> Demonstrating why traditional distorted-text image CAPTCHAs no longer protect public web infrastructure.

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 💡 The Core Thesis

> *"Distorted text and digit CAPTCHAs are virtually useless today. Modern off-the-shelf multimodal AI vision models can effortlessly interpret and solve these puzzles in seconds with simple prompting."*

For nearly two decades, public portals—including government and institutional education board websites—have relied on traditional distorted image CAPTCHAs (such as 4-digit warped numbers overlaid on noisy, curved backgrounds) under the legacy assumption that computers cannot decipher distorted typography.

This repository serves as a **technical case study and proof-of-concept** demonstrating that this assumption is completely broken in the era of multimodal Large Language Models (LLMs).

---

## 🔍 The Illusion of "Image Puzzle" Security

### 1. Trivial for Modern Multimodal AI
Using standard commodity vision models (such as `google/gemma-4-26b-a4b-it` or `gemini-2.5-flash`), these distorted puzzles can be solved in **1 to 2 seconds** with **>95% accuracy**.
* No custom dataset training required.
* No complex OpenCV noise-filtering or contour segmentation needed.
* Simply sending the raw JPEG with a 1-line prompt:
  > *"what are the 4 digits written on paper from left to right? there are exactly 4 digits. only answer in digits. nothing else"*

The model effortlessly extracts the exact numbers:
```
Raw Distorted Image ──► Multimodal Vision Model ──► Solved: "8119" (in ~1.2s)
```

### 2. The Real Victims: Human Users & Accessibility
While automated systems solve these puzzles instantly, human users suffer the consequences:
* **Accessibility Failure**: Visually impaired users or individuals using screen readers are completely locked out unless audio alternatives exist.
* **Mobile Friction**: Students checking exam scores on low-resolution smartphones or under unstable connections frequently mistype distorted digits.
* **High Failure Rates Under Stress**: During nationwide result publication moments, distorted digits frustrate legitimate human users while automated bots breeze through them.

### 3. Server-Side Overhead & "Security Theater"
Generating dynamic JPEG images on the server for every single visitor consumes server CPU, memory, and database session state. In return, it provides zero meaningful protection against automated queries.

### 4. The Economics: Solving 10,000 CAPTCHAs for Just ~$0.10

Historically, bypassing CAPTCHAs required human-solving farms (such as 2Captcha or Anti-Captcha), costing approximately **$1.00 to $3.00 per 1,000 solves**.

With modern vision model pricing (e.g. `google/gemma-4-26b-a4b-it` at **$0.042 / $0.22 per 1M tokens**), the economic barrier has completely collapsed:

* **Per-CAPTCHA Consumption**:
  * **Input**: ~200 tokens (JPEG image base64 + prompt)
  * **Output**: ~10 tokens (4 digits)

* **Cost Calculation for 10,000 Solves**:
  * **Input Tokens**: $10,000 \times 200 = 2,000,000$ tokens $\rightarrow 2 \times \$0.042 = \mathbf{\$0.084}$
  * **Output Tokens**: $10,000 \times 10 = 100,000$ tokens $\rightarrow 0.1 \times \$0.22 = \mathbf{\$0.022}$
  * **Total Cost for 10,000 Solves**: **$\approx \$0.106$ (~10.6 cents / ~13 BDT)**

**This is shockingly cheap.** Bypassing 10,000 security CAPTCHA challenges costs barely a dime ($0.00001 per solve). The cost barrier that previously deterred mass automated attacks has been reduced to practically zero.

---

## 📊 Empirical Benchmark & Test Results

To validate the thesis with real empirical measurements, we ran an automated benchmark trial evaluating live distorted CAPTCHA images directly from the portal using `google/gemma-4-26b-a4b-it`:

### Benchmark Summary Statistics

| Metric | Measured Result |
| :--- | :--- |
| **Model Evaluated** | `google/gemma-4-26b-a4b-it` (via OpenRouter) |
| **Sample Size** | 10 Live CAPTCHAs |
| **Success Rate (Valid 4-Digit Recognition)** | **10 / 10 (100.0%)** |
| **Average AI Solve Latency** | **2.03 seconds** |
| **Fastest Solve Latency** | **0.92 seconds** |
| **Slowest Solve Latency** | **3.78 seconds** |
| **Average End-to-End Latency** | **2.35 seconds** *(including download + AI)* |

### Sample-by-Sample Breakdown

| Sample | Recognized Digits | AI Solve Time | Total Time | Status |
| :---: | :---: | :---: | :---: | :---: |
| **#01** | `6549` | 3.78s | 4.35s | ✅ Valid |
| **#02** | `1702` | 2.39s | 2.98s | ✅ Valid |
| **#03** | `3200` | 2.12s | 2.33s | ✅ Valid |
| **#04** | `1182` | 1.73s | 1.94s | ✅ Valid |
| **#05** | `1476` | 2.18s | 2.40s | ✅ Valid |
| **#06** | `2556` | 1.49s | 1.70s | ✅ Valid |
| **#07** | `5902` | 0.92s | 1.13s | ✅ Valid |
| **#08** | `8406` | 2.69s | 2.90s | ✅ Valid |
| **#09** | `2720` | 1.82s | 2.03s | ✅ Valid |
| **#10** | `5999` | 1.21s | 1.42s | ✅ Valid |

> **Key Finding**: In 10 consecutive trials, the model parsed every single distorted CAPTCHA without a single failure, averaging **~2 seconds per solve**. This confirms that distorted visual puzzles impose virtually zero deterrence against automated systems.

You can reproduce this benchmark trial at any time:
```bash
npm run benchmark
```

---

## 🛠️ How This Demonstration Works

This project provides a minimal Node.js implementation showing the end-to-end automation loop:

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTOMATION LOOP                        │
└─────────────────────────────────────────────────────────────┘
  1. Headless Browser (Puppeteer)
     └── Passes basic challenge & saves active session cookies
  2. Request Target Image (/v2/captcha)
     └── Grabs the raw distorted JPEG from the server
  3. AI Multimodal Vision (OpenRouter / Gemini)
     └── Model parses image & extracts the 4 numbers
  4. Submit Verification Query (/v2/getres)
     └── Server accepts the code and returns the result data
```

---

## 🚀 Running the Demonstration

### 1. Prerequisites
* Node.js v20+
* An API key for [OpenRouter](https://openrouter.ai/) or [Google AI Studio](https://aistudio.google.com/)

### 2. Setup
```bash
git clone https://github.com/your-username/nctb-result.git
cd nctb-result
npm install
```

Copy and populate your `.env`:
```bash
cp .env.example .env
```

```ini
# OpenRouter (Default)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it

# Google Gemini (Optional)
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemma-4-26b-a4b-it

CAPTCHA_PROVIDER=openrouter
PORT=3000
```

### 3. Run the Demonstration CLI
Run a single lookup demonstration from your terminal:
```bash
node src/cli.js 100001 1234567890 dhaka 2024 ssc
```

**Observed Terminal Output:**
```text
[ResultService] Starting query for Roll: 100001, Board: dhaka, Year: 2024...
[CaptchaService] Solved digits: 7647 (Provider: OpenRouter, Model: google/gemma-4-26b-a4b-it)
[ResultService] Attempt 1: Submitting with code: 7647...
[ResultService] Result successfully retrieved!
```

### 4. Run the Demonstration REST Server
```bash
npm start
```
Test via curl:
```bash
curl "http://localhost:3000/api/result?roll=100001&reg=1234567890&board=dhaka&year=2024&exam=ssc"
```

---

## 🛡️ What Public Infrastructure Should Use Instead

Distorted image puzzles no longer stop bots. Simpler, stronger options:

| Obsolete Technique | Better Replacement | Why It Works |
| :--- | :--- | :--- |
| **Distorted image digits** | **reCAPTCHA v3 / Cloudflare Turnstile** | Scores visitors in the background, so real users rarely see a puzzle. |
| **Session-locked JPEGs** | **Cloudflare Bot Management + rate limiting** | Detects automated browsers and blocks bulk traffic at the edge. |
| **No public API** | **Official, rate-limited JSON API** | Gives developers a legitimate path and reduces scraping. |

> No single control is perfect. Combine bot detection with rate limiting for the best protection.

---

## ⚖️ Ethical & Educational Notice

> **Notice**: Here I use the Bangladesh educational board website data, but it is strictly for educational purposes only. Do not misuse this.

* **Purpose**: This repository is strictly an **educational and security research demonstration** showing the vulnerability of legacy image challenges to modern multimodal LLMs.
* **Disclaimer**: This project is not affiliated with, endorsed by, or connected to the Bangladesh Ministry of Education, NCTB, or any examination board.
* **Temporal Notice**: This project and research were written on **12 October 2026**. The target website's verification flow, markup, or security architecture may update at any time, which may cause this demonstration to stop working without notice.
* **Responsible Usage**: Do not use this proof-of-concept for unauthorized mass extraction, denial of service, or commercial purposes.

---

## 📄 License

This research proof-of-concept is released under the [MIT License](LICENSE).
