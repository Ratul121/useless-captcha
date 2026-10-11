import express from 'express';
import { fetchResult } from '../services/resultService.js';
import { getSessionStatus, getSession } from '../services/sessionService.js';

export const resultRoutes = express.Router();

/**
 * GET /api/session-status
 * Check current human_session health & expiration
 */
resultRoutes.get('/session-status', async (req, res) => {
  try {
    const status = await getSessionStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/session-refresh
 * Manually forces headless browser re-verification
 */
resultRoutes.post('/session-refresh', async (req, res) => {
  try {
    const session = await getSession(true);
    return res.json({
      success: true,
      message: 'Session refreshed successfully',
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Handle Result Query
 */
async function handleQuery(req, res) {
  const query = {
    ...req.query,
    ...req.body,
  };

  if (!query.roll) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: roll',
    });
  }

  try {
    const result = await fetchResult(query);
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

/**
 * GET /api/result?roll=100001&reg=1234567890&board=dhaka&year=2024&exam=ssc
 */
resultRoutes.get('/result', handleQuery);

/**
 * POST /api/result
 * Body: { roll: "100001", reg: "1234567890", board: "dhaka", year: "2024", exam: "ssc" }
 */
resultRoutes.post('/result', handleQuery);
