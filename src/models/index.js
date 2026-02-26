// MongoDB Models Index
// This file exports all Mongoose models for easy importing

const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const MobileMiningSession = require('./MobileMiningSession');
const ContactSubmission = require('./ContactSubmission');
const SupportTicket = require('./SupportTicket');
const NewsletterSubscription = require('./NewsletterSubscription');
const NewsletterCampaign = require('./NewsletterCampaign');
const MentorshipApplication = require('./MentorshipApplication');
const ScholarshipApplication = require('./ScholarshipApplication');
const AdminSettings = require('./AdminSettings');
const Task = require('./Task');
const UserTask = require('./UserTask');
const ExternalLinkSession = require('./ExternalLinkSession');
const Donation = require('./Donation');

// Note: Additional models to be created:
// - MentorshipConnection
// - MentorshipSession
// - ScholarshipAward
// - ScholarshipDisbursement

module.exports = {
  User,
  Wallet,
  Transaction,
  MobileMiningSession,
  ContactSubmission,
  SupportTicket,
  NewsletterSubscription,
  NewsletterCampaign,
  MentorshipApplication,
  ScholarshipApplication,
  AdminSettings,
  Task,
  UserTask,
  ExternalLinkSession,
  Donation
};
