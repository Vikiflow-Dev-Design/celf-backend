const express = require('express');
const router = express.Router();
const ExternalLinkSession = require('../models/ExternalLinkSession');
const { createResponse } = require('../utils/responseUtils');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * Create or update external link session
 * POST /api/external-link-sessions
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { taskId, linkUrl } = req.body;

    if (!taskId) {
      return res.status(400).json(createResponse(false, 'Task ID is required'));
    }

    // Check if there's already an active session
    let session = await ExternalLinkSession.findActiveSession(userId, taskId);

    if (session) {
      // Update existing session
      session.hasVisitedExternalLink = true;
      session.visitedAt = new Date();
      if (linkUrl) session.linkUrl = linkUrl;
      await session.save();
    } else {
      // Create new session
      const metadata = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress
      };
      
      session = await ExternalLinkSession.createSession(userId, taskId, linkUrl, metadata);
    }

    res.status(201).json(createResponse(true, 'External link session created/updated successfully', {
      sessionId: session._id,
      sessionKey: session.sessionKey,
      hasVisitedExternalLink: session.hasVisitedExternalLink,
      expiresAt: session.expiresAt
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Get external link session status
 * GET /api/external-link-sessions/:taskId
 */
router.get('/:taskId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { taskId } = req.params;

    const session = await ExternalLinkSession.findActiveSession(userId, taskId);

    if (!session) {
      return res.status(404).json(createResponse(false, 'No active session found'));
    }

    res.json(createResponse(true, 'Session retrieved successfully', {
      sessionId: session._id,
      sessionKey: session.sessionKey,
      hasVisitedExternalLink: session.hasVisitedExternalLink,
      hasReturnedFromExternalLink: session.hasReturnedFromExternalLink,
      visitedAt: session.visitedAt,
      returnedAt: session.returnedAt,
      expiresAt: session.expiresAt,
      status: session.status,
      isValid: session.isValid()
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Mark session as returned from external link
 * PUT /api/external-link-sessions/:taskId/return
 */
router.put('/:taskId/return', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { taskId } = req.params;

    const session = await ExternalLinkSession.findActiveSession(userId, taskId);

    if (!session) {
      return res.status(404).json(createResponse(false, 'No active session found'));
    }

    await session.markAsReturned();

    res.json(createResponse(true, 'Session marked as returned successfully', {
      sessionId: session._id,
      hasReturnedFromExternalLink: session.hasReturnedFromExternalLink,
      returnedAt: session.returnedAt,
      status: session.status
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Delete/clear external link session
 * DELETE /api/external-link-sessions/:taskId
 */
router.delete('/:taskId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { taskId } = req.params;

    const result = await ExternalLinkSession.deleteMany({ userId, taskId });

    res.json(createResponse(true, 'Session(s) cleared successfully', {
      deletedCount: result.deletedCount
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Get all user sessions (for debugging/admin)
 * GET /api/external-link-sessions
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 10, page = 1 } = req.query;

    const query = { userId };
    if (status) query.status = status;

    const sessions = await ExternalLinkSession.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ExternalLinkSession.countDocuments(query);

    res.json(createResponse(true, 'Sessions retrieved successfully', {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * Cleanup expired sessions (admin endpoint)
 * POST /api/external-link-sessions/cleanup
 */
router.post('/cleanup', authenticate, async (req, res, next) => {
  try {
    // This could be restricted to admin users in the future
    const result = await ExternalLinkSession.cleanupExpiredSessions();

    res.json(createResponse(true, 'Expired sessions cleaned up successfully', {
      deletedCount: result.deletedCount
    }));
  } catch (error) {
    next(error);
  }
});

module.exports = router;