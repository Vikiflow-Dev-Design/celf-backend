const NewsletterSubscription = require('../models/NewsletterSubscription');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const emailService = require('../services/emailService');
const { createResponse } = require('../utils/responseUtils');
class NewsletterController {
  // Public: Subscribe to newsletter
  async subscribe(req, res, next) {
    try {
      const { email, firstName, lastName, preferences } = req.body;

      let subscription = await NewsletterSubscription.findOne({ email });

      if (subscription) {
        if (subscription.status === 'active') {
          return res.status(400).json(createResponse(false, 'Email is already subscribed'));
        }

        // Reactivate subscription
        subscription.status = 'active';
        subscription.firstName = firstName || subscription.firstName;
        subscription.lastName = lastName || subscription.lastName;
        if (preferences) subscription.preferences = { ...subscription.preferences, ...preferences };
        subscription.unsubscribedAt = undefined;
        subscription.unsubscribeReason = undefined;

        await subscription.save();
      } else {
        // Create new subscription
        subscription = await NewsletterSubscription.create({
          email,
          firstName,
          lastName,
          preferences: preferences || { frequency: 'weekly', topics: [], format: 'html' }
        });
      }

      res.status(201).json(createResponse(true, 'Successfully subscribed to newsletter', {
        subscription: {
          id: subscription._id,
          email: subscription.email,
          status: subscription.status,
          preferences: subscription.preferences
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  // Public: Unsubscribe
  async unsubscribe(req, res, next) {
    try {
      const { email, reason } = req.body;

      const subscription = await NewsletterSubscription.findOne({ email });

      if (!subscription) {
        return res.status(404).json(createResponse(false, 'Subscription not found'));
      }

      if (subscription.status === 'unsubscribed') {
        return res.json(createResponse(true, 'Already unsubscribed'));
      }

      subscription.status = 'unsubscribed';
      subscription.unsubscribedAt = new Date();
      subscription.unsubscribeReason = reason;
      await subscription.save();

      res.json(createResponse(true, 'Successfully unsubscribed from newsletter'));
    } catch (error) {
      next(error);
    }
  }

  // Public: Unsubscribe by token
  async unsubscribeByToken(req, res, next) {
    try {
      const { token } = req.params;

      const subscription = await NewsletterSubscription.findOne({ unsubscribeToken: token });

      if (!subscription) {
        return res.status(404).json(createResponse(false, 'Invalid unsubscribe token'));
      }

      if (subscription.status !== 'unsubscribed') {
        subscription.status = 'unsubscribed';
        subscription.unsubscribedAt = new Date();
        subscription.unsubscribeReason = 'Unsubscribed via link';
        await subscription.save();
      }

      res.json(createResponse(true, 'Successfully unsubscribed from newsletter'));
    } catch (error) {
      next(error);
    }
  }

  // Public: Update preferences
  async updatePreferences(req, res, next) {
    try {
      const { email, preferences } = req.body;

      const subscription = await NewsletterSubscription.findOne({ email });

      if (!subscription) {
        return res.status(404).json(createResponse(false, 'Subscription not found'));
      }

      subscription.preferences = { ...subscription.preferences, ...preferences };
      await subscription.save();

      res.json(createResponse(true, 'Preferences updated successfully', {
        subscription: {
          email: subscription.email,
          preferences: subscription.preferences
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  // Public: Get status
  async getSubscriptionStatus(req, res, next) {
    try {
      const { email } = req.params;

      const subscription = await NewsletterSubscription.findOne({ email });

      if (!subscription) {
        return res.status(404).json(createResponse(false, 'Subscription not found'));
      }

      res.json(createResponse(true, 'Subscription status retrieved successfully', {
        email: subscription.email,
        status: subscription.status,
        subscribedAt: subscription.subscribedAt,
        preferences: subscription.preferences
      }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get all subscribers
  async getSubscribers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { status, search } = req.query;

      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (search) {
        query.email = { $regex: search, $options: 'i' };
      }

      const total = await NewsletterSubscription.countDocuments(query);
      const subscribers = await NewsletterSubscription.find(query)
        .sort({ subscribedAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json(createResponse(true, 'Subscribers retrieved successfully', {
        subscribers: subscribers.map(sub => ({
          id: sub._id,
          email: sub.email,
          firstName: sub.firstName,
          lastName: sub.lastName,
          status: sub.status,
          preferences: sub.preferences,
          subscribedAt: sub.subscribedAt
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get subscriber stats
  async getSubscriberStats(req, res, next) {
    try {
      const total = await NewsletterSubscription.countDocuments();
      const active = await NewsletterSubscription.countDocuments({ status: 'active' });
      const unsubscribed = await NewsletterSubscription.countDocuments({ status: 'unsubscribed' });
      const bounced = await NewsletterSubscription.countDocuments({ status: 'bounced' });

      // Get recent growth (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newSubscribers = await NewsletterSubscription.countDocuments({
        subscribedAt: { $gte: thirtyDaysAgo }
      });

      res.json(createResponse(true, 'Subscriber stats retrieved successfully', {
        total,
        active,
        unsubscribed,
        bounced,
        newLast30Days: newSubscribers
      }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Delete subscriber
  async deleteSubscriber(req, res, next) {
    try {
      const { id } = req.params;

      const result = await NewsletterSubscription.findByIdAndDelete(id);

      if (!result) {
        return res.status(404).json(createResponse(false, 'Subscriber not found'));
      }

      res.json(createResponse(true, 'Subscriber deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Create Campaign
  async createCampaign(req, res, next) {
    try {
      const { subject, content, scheduledFor, targetAudience } = req.body;

      let userId = req.user ? req.user._id : null;

      // Fallback if auth is disabled (demo mode)
      if (!userId) {
        try {
          const User = require('../models/User');
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            userId = adminUser._id;
          } else {
            const anyUser = await User.findOne();
            if (anyUser) userId = anyUser._id;
          }
        } catch (err) {
          console.warn('Failed to find fallback user for campaign creation', err);
        }

        // If still no user, generate a random ID to satisfy schema
        if (!userId) {
          const mongoose = require('mongoose');
          userId = new mongoose.Types.ObjectId();
        }
      }

      const campaign = await NewsletterCampaign.create({
        subject,
        content,
        scheduledFor,
        targetAudience,
        status: scheduledFor ? 'scheduled' : 'draft',
        createdBy: userId
      });

      res.status(201).json(createResponse(true, 'Campaign created successfully', { campaign }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get Campaigns
  async getCampaigns(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const total = await NewsletterCampaign.countDocuments();
      const campaigns = await NewsletterCampaign.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email');

      res.json(createResponse(true, 'Campaigns retrieved successfully', {
        campaigns,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Get Campaign by ID
  async getCampaignById(req, res, next) {
    try {
      const { id } = req.params;
      const campaign = await NewsletterCampaign.findById(id).populate('createdBy', 'firstName lastName email');

      if (!campaign) {
        return res.status(404).json(createResponse(false, 'Campaign not found'));
      }

      res.json(createResponse(true, 'Campaign retrieved successfully', { campaign }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Update Campaign
  async updateCampaign(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const campaign = await NewsletterCampaign.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!campaign) {
        return res.status(404).json(createResponse(false, 'Campaign not found'));
      }

      res.json(createResponse(true, 'Campaign updated successfully', { campaign }));
    } catch (error) {
      next(error);
    }
  }

  // Admin: Send Campaign
  async sendCampaign(req, res, next) {
    try {
      const { id } = req.params;

      const campaign = await NewsletterCampaign.findById(id);
      if (!campaign) {
        return res.status(404).json(createResponse(false, 'Campaign not found'));
      }

      if (campaign.status === 'sent') {
        return res.status(400).json(createResponse(false, 'Campaign already sent'));
      }

      // Get active subscribers
      const subscribers = await NewsletterSubscription.find({ status: 'active' });

      if (subscribers.length === 0) {
        return res.status(400).json(createResponse(false, 'No active subscribers found'));
      }

      // Update status to sending (if we had a 'sending' status, but for now we'll just mark as sent after)
      // Or we can just start sending asynchronously

      // Send response immediately
      res.json(createResponse(true, 'Campaign sending initiated', {
        campaignId: id,
        recipientCount: subscribers.length
      }));

      // Background process
      (async () => {
        try {
          console.log(`Starting campaign send: ${campaign.subject} to ${subscribers.length} subscribers`);
          let sentCount = 0;
          let failCount = 0;

          for (const subscriber of subscribers) {
            try {
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
              const unsubscribeLink = `${frontendUrl}/newsletter/unsubscribe/${subscriber.unsubscribeToken}`;
              const personalizedHtml = `
                ${campaign.content}
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
                  <p>You received this email because you subscribed to our newsletter.</p>
                  <p><a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
                </div>
              `;

              await emailService.sendEmail({
                to: subscriber.email,
                subject: campaign.subject,
                html: personalizedHtml
              });
              sentCount++;
            } catch (err) {
              console.error(`Failed to send to ${subscriber.email}:`, err);
              failCount++;
            }
          }

          // Update campaign status
          campaign.status = 'sent';
          campaign.sentAt = new Date();
          campaign.stats = {
            sent: sentCount,
            delivered: sentCount, // Assuming delivered if sent for now
            opens: 0,
            clicks: 0,
            bounces: failCount
          };
          await campaign.save();
          console.log(`Campaign ${id} completed. Sent: ${sentCount}, Failed: ${failCount}`);

        } catch (err) {
          console.error('Campaign sending failed:', err);
          campaign.status = 'failed';
          await campaign.save();
        }
      })();

    } catch (error) {
      next(error);
    }
  }

  // Placeholder analytics methods
  async getOpenAnalytics(req, res, next) { res.status(200).end(); }
  async getClickAnalytics(req, res, next) { res.status(200).end(); }
}

module.exports = new NewsletterController();
