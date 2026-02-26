#!/usr/bin/env node

/**
 * Script to update all controllers to use MongoDB service instead of Supabase service
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

// List of files to update (controllers, middleware, services)
const filesToUpdate = [
  'controllers/adminController.js',
  'controllers/userController.js',
  'middleware/authMiddleware.js',
  'services/miningService.js',
  'services/mobileMiningService.js'
];

// Field mappings from Supabase (snake_case) to MongoDB (camelCase)
const fieldMappings = {
  // User fields
  'first_name': 'firstName',
  'last_name': 'lastName',
  'is_active': 'isActive',
  'last_login': 'lastLogin',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'profile_image_url': 'profileImageUrl',
  
  // Wallet fields
  'user_id': 'userId',
  'sendable_balance': 'sendableBalance',
  'non_sendable_balance': 'nonSendableBalance',
  'pending_balance': 'pendingBalance',
  'total_balance': 'totalBalance',
  'current_address': 'currentAddress',
  'last_exchange_rate': 'lastExchangeRate',
  'total_sent': 'totalSent',
  'total_received': 'totalReceived',
  'total_mined': 'totalMined',
  'is_locked': 'isLocked',
  'lock_reason': 'lockReason',
  'last_activity': 'lastActivity',
  
  // Transaction fields
  'from_user_id': 'fromUserId',
  'to_user_id': 'toUserId',
  'from_address': 'fromAddress',
  'to_address': 'toAddress',
  'mining_rate': 'miningRate',
  'referral_id': 'referralId',
  'exchange_details': 'exchangeDetails',
  'block_number': 'blockNumber',
  'gas_used': 'gasUsed',
  'error_message': 'errorMessage',
  'retry_count': 'retryCount',
  'scheduled_at': 'scheduledAt',
  'processed_at': 'processedAt',
  
  // Mining session fields
  'tokens_earned': 'tokensEarned',
  'runtime_seconds': 'runtimeSeconds',
  'started_at': 'startedAt',
  'paused_at': 'pausedAt',
  'completed_at': 'completedAt',
  
  // Contact submission fields
  'inquiry_type': 'inquiryType',
  'assigned_to': 'assignedTo',
  
  // Newsletter fields
  'unsubscribe_token': 'unsubscribeToken',
  'unsubscribe_reason': 'unsubscribeReason',
  'subscribed_at': 'subscribedAt',
  'unsubscribed_at': 'unsubscribedAt',
  'scheduled_for': 'scheduledFor',
  'sent_at': 'sentAt',
  'target_audience': 'targetAudience',
  'created_by': 'createdBy',
  
  // Mentorship fields
  'current_education': 'currentEducation',
  'linkedin_profile': 'linkedinProfile',
  'resume_url': 'resumeUrl',
  'review_notes': 'reviewNotes',
  'reviewed_by': 'reviewedBy',
  'reviewed_at': 'reviewedAt'
};

function updateControllerFile(filePath) {
  console.log(`Updating ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update import statement
  content = content.replace(
    /const supabaseService = require\('\.\.\/services\/supabaseService'\);/g,
    "const mongodbService = require('../services/mongodbService');"
  );
  
  // Update service calls
  content = content.replace(/supabaseService\./g, 'mongodbService.');
  
  // Update field names in the content
  for (const [oldField, newField] of Object.entries(fieldMappings)) {
    // Update field access patterns
    content = content.replace(new RegExp(`\\.${oldField}\\b`, 'g'), `.${newField}`);
    content = content.replace(new RegExp(`'${oldField}'`, 'g'), `'${newField}'`);
    content = content.replace(new RegExp(`"${oldField}"`, 'g'), `"${newField}"`);
    
    // Update object property patterns
    content = content.replace(new RegExp(`${oldField}:`, 'g'), `${newField}:`);
  }
  
  // Update specific table names for MongoDB models
  const tableToModelMappings = {
    'users': 'User',
    'wallets': 'Wallet',
    'transactions': 'Transaction',
    'mining_sessions': 'MiningSession',
    'contact_submissions': 'ContactSubmission',
    'support_tickets': 'SupportTicket',
    'newsletter_subscriptions': 'NewsletterSubscription',
    'newsletter_campaigns': 'NewsletterCampaign',
    'mentorship_applications': 'MentorshipApplication',
    'scholarship_applications': 'ScholarshipApplication',
    'admin_settings': 'AdminSettings'
  };
  
  for (const [tableName, modelName] of Object.entries(tableToModelMappings)) {
    content = content.replace(new RegExp(`'${tableName}'`, 'g'), `'${modelName}'`);
    content = content.replace(new RegExp(`"${tableName}"`, 'g'), `"${modelName}"`);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${filePath}`);
}

function main() {
  console.log('🔄 Starting file update process...\n');

  const srcDir = path.join(__dirname, 'src');

  for (const fileName of filesToUpdate) {
    const filePath = path.join(srcDir, fileName);

    if (fs.existsSync(filePath)) {
      try {
        updateControllerFile(filePath);
      } catch (error) {
        console.error(`❌ Error updating ${fileName}:`, error.message);
      }
    } else {
      console.log(`⚠️  File not found: ${fileName}`);
    }
  }

  console.log('\n✅ File update process completed!');
  console.log('\n📝 Manual review recommended for:');
  console.log('- Complex query logic');
  console.log('- Custom field mappings');
  console.log('- Error handling patterns');
  console.log('- Validation logic');
}

if (require.main === module) {
  main();
}

module.exports = { updateControllerFile, fieldMappings };
