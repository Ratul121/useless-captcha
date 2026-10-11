import { getSession } from './services/sessionService.js';
import { downloadCaptcha, solveCaptcha } from './services/captchaService.js';
import { config } from './config.js';

async function runBenchmark(sampleSize = 10) {
  console.log(`=======================================================`);
  console.log(`  AI CAPTCHA SOLVER BENCHMARK`);
  console.log(`  Model: ${config.openrouterModel}`);
  console.log(`  Provider: ${config.captchaProvider}`);
  console.log(`  Sample Size: ${sampleSize}`);
  console.log(`=======================================================\n`);

  const session = await getSession();
  console.log(`[Init] Valid session active. Starting sample collection...\n`);

  const results = [];

  for (let i = 1; i <= sampleSize; i++) {
    const sampleStart = Date.now();
    try {
      // 1. Download fresh CAPTCHA
      const downloadStart = Date.now();
      const imageBuffer = await downloadCaptcha(session);
      const downloadTime = Date.now() - downloadStart;

      // 2. Solve with AI vision model
      const solveStart = Date.now();
      const digits = await solveCaptcha(imageBuffer, { provider: 'openrouter' });
      const solveTime = Date.now() - solveStart;

      const totalTime = Date.now() - sampleStart;
      const isValidFormat = /^\d{4}$/.test(digits);

      results.push({
        id: i,
        digits,
        isValidFormat,
        solveTimeMs: solveTime,
        downloadTimeMs: downloadTime,
        totalTimeMs: totalTime,
        success: isValidFormat,
      });

      console.log(`[Sample ${String(i).padStart(2, '0')}/${sampleSize}] Solved: "${digits}" | Solve Time: ${(solveTime / 1000).toFixed(2)}s | Total: ${(totalTime / 1000).toFixed(2)}s | Valid: ${isValidFormat ? '✅' : '❌'}`);

      // Modest pause between queries to be respectful
      if (i < sampleSize) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (err) {
      console.error(`[Sample ${String(i).padStart(2, '0')}/${sampleSize}] ❌ Error:`, err.message);
      results.push({
        id: i,
        digits: 'ERROR',
        isValidFormat: false,
        solveTimeMs: 0,
        downloadTimeMs: 0,
        totalTimeMs: Date.now() - sampleStart,
        success: false,
        error: err.message,
      });
    }
  }

  // Calculate statistics
  const successful = results.filter(r => r.success);
  const solveTimes = successful.map(r => r.solveTimeMs);

  const avgSolveTime = solveTimes.reduce((a, b) => a + b, 0) / (solveTimes.length || 1);
  const minSolveTime = Math.min(...solveTimes);
  const maxSolveTime = Math.max(...solveTimes);
  const successRate = ((successful.length / sampleSize) * 100).toFixed(1);

  console.log(`\n=======================================================`);
  console.log(`  BENCHMARK SUMMARY STATISTICS`);
  console.log(`=======================================================`);
  console.log(`  Total Samples Evaluated:   ${sampleSize}`);
  console.log(`  Successful Solves (4-digit): ${successful.length}/${sampleSize} (${successRate}%)`);
  console.log(`  Average AI Solve Time:     ${(avgSolveTime / 1000).toFixed(2)}s`);
  console.log(`  Fastest Solve Time:        ${(minSolveTime / 1000).toFixed(2)}s`);
  console.log(`  Slowest Solve Time:        ${(maxSolveTime / 1000).toFixed(2)}s`);
  console.log(`=======================================================\n`);

  return {
    sampleSize,
    successRate,
    avgSolveTime,
    minSolveTime,
    maxSolveTime,
    results,
  };
}

runBenchmark(10).catch(err => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
