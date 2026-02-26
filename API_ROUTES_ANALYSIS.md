# CELF Backend API Routes - Based on Actual Project Analysis

This document outlines the API routes designed specifically for the **celf-mobile** and **celf-website-2** projects based on actual code analysis.

## 🔍 Analysis Summary

After analyzing both projects, I identified that the original generic backend routes didn't match the real requirements. Here's what was actually needed:

### **📱 Mobile App Requirements (celf-mobile)**
- **Clerk Authentication** (not custom JWT)
- **Mining System** with real-time progress
- **Wallet Management** with sendable/non-sendable token types
- **Transaction History** and management
- **User Profile** sync with Clerk

### **🌐 Website Requirements (celf-website-2)**
- **Contact Forms** submission
- **Newsletter** subscription management
- **Mentorship Applications** (mentor/mentee)
- **Scholarship Applications** with document uploads

## 📋 Complete API Endpoints

### **🔐 Authentication & User Management**

#### Clerk Integration (Mobile App)
```
POST   /api/clerk/webhooks/user          # Clerk user webhooks
POST   /api/clerk/webhooks/session       # Clerk session webhooks
POST   /api/clerk/sync-user              # Sync Clerk user to backend
GET    /api/clerk/user/:clerkUserId      # Get user by Clerk ID
PUT    /api/clerk/user/:clerkUserId      # Update user from Clerk
```

#### Traditional Auth (Fallback)
```
POST   /api/auth/register                # User registration
POST   /api/auth/login                   # User login
POST   /api/auth/logout                  # User logout
POST   /api/auth/refresh-token           # Refresh JWT token
POST   /api/auth/forgot-password         # Password reset request
POST   /api/auth/reset-password          # Password reset
GET    /api/auth/verify-email/:token     # Email verification
```

#### User Profile
```
GET    /api/users/profile                # Get user profile
PUT    /api/users/profile                # Update user profile
POST   /api/users/change-password        # Change password
DELETE /api/users/account                # Delete account
```

### **⛏️ Mining System (Mobile App)**

```
GET    /api/mining/status                # Current mining status
POST   /api/mining/start                 # Start mining session
POST   /api/mining/stop                  # Stop mining session
POST   /api/mining/pause                 # Pause mining session
POST   /api/mining/resume                # Resume mining session
POST   /api/mining/progress              # Update mining progress
GET    /api/mining/current-session       # Get current session
GET    /api/mining/sessions              # Get mining history
GET    /api/mining/sessions/:id          # Get specific session
GET    /api/mining/stats                 # User mining statistics
GET    /api/mining/stats/daily           # Daily mining stats
GET    /api/mining/stats/weekly          # Weekly mining stats
GET    /api/mining/stats/monthly         # Monthly mining stats
GET    /api/mining/rate                  # Get mining rate
PUT    /api/mining/rate                  # Update mining rate
GET    /api/mining/achievements          # Mining achievements
GET    /api/mining/milestones            # Mining milestones
GET    /api/mining/leaderboard           # Mining leaderboard
GET    /api/mining/leaderboard/friends   # Friends leaderboard
```

### **💰 Wallet Management (Mobile App)**

```
GET    /api/wallet/balance               # Get wallet balance
GET    /api/wallet/balance/breakdown     # Get balance breakdown (sendable/non-sendable)
GET    /api/wallet/addresses             # Get wallet addresses
POST   /api/wallet/addresses             # Add new address
PUT    /api/wallet/addresses/:address/default  # Set default address
GET    /api/wallet/transactions          # Get transaction history
GET    /api/wallet/transactions/:id      # Get specific transaction
POST   /api/wallet/send                  # Send tokens
POST   /api/wallet/exchange              # Exchange token types
GET    /api/wallet/exchange/rates        # Get exchange rates
POST   /api/wallet/mining-reward         # Add mining reward (internal)
GET    /api/wallet/stats                 # Wallet statistics
GET    /api/wallet/preferences           # Get wallet preferences
PUT    /api/wallet/preferences           # Update wallet preferences
```

### **📞 Contact & Support (Website)**

```
POST   /api/contact/form                 # Submit contact form
POST   /api/contact/support              # Create support ticket
GET    /api/contact/submissions          # Get contact submissions (admin)
GET    /api/contact/support/tickets      # Get support tickets
GET    /api/contact/support/tickets/:id  # Get specific ticket
PUT    /api/contact/support/tickets/:id/status  # Update ticket status
POST   /api/contact/support/tickets/:id/responses  # Add ticket response
```

### **📧 Newsletter (Website)**

```
POST   /api/newsletter/subscribe         # Subscribe to newsletter
POST   /api/newsletter/unsubscribe       # Unsubscribe from newsletter
GET    /api/newsletter/unsubscribe/:token  # Unsubscribe via email link
PUT    /api/newsletter/preferences       # Update subscription preferences
GET    /api/newsletter/status/:email     # Get subscription status
GET    /api/newsletter/subscribers       # Get subscribers (admin)
GET    /api/newsletter/subscribers/stats # Subscriber statistics
POST   /api/newsletter/campaigns         # Create campaign (admin)
GET    /api/newsletter/campaigns         # Get campaigns (admin)
POST   /api/newsletter/campaigns/:id/send  # Send campaign
```

### **🎓 Mentorship Program (Website)**

```
POST   /api/mentorship/apply/mentor      # Apply as mentor
POST   /api/mentorship/apply/mentee      # Apply as mentee
GET    /api/mentorship/mentors           # Get available mentors
GET    /api/mentorship/mentors/:id       # Get mentor details
GET    /api/mentorship/application/status/:email  # Check application status
GET    /api/mentorship/my-applications   # Get user's applications (auth)
GET    /api/mentorship/my-profile        # Get mentorship profile (auth)
PUT    /api/mentorship/my-profile        # Update profile (auth)
GET    /api/mentorship/matches           # Get matches (auth)
POST   /api/mentorship/connect/:mentorId # Request connection (auth)
GET    /api/mentorship/sessions          # Get mentorship sessions (auth)
POST   /api/mentorship/sessions          # Schedule session (auth)
GET    /api/mentorship/applications      # Get all applications (admin)
PUT    /api/mentorship/applications/:id/status  # Update application status (admin)
```

### **🎓 Scholarship Program (Website)**

```
GET    /api/scholarship/programs         # Get scholarship programs
GET    /api/scholarship/requirements     # Get application requirements
POST   /api/scholarship/apply            # Submit scholarship application
POST   /api/scholarship/documents/upload # Upload documents
GET    /api/scholarship/application/status/:email  # Check application status
GET    /api/scholarship/my-applications  # Get user's applications (auth)
GET    /api/scholarship/my-awards        # Get user's awards (auth)
GET    /api/scholarship/applications     # Get all applications (admin)
PUT    /api/scholarship/applications/:id/status  # Update application status (admin)
POST   /api/scholarship/applications/:id/score   # Score application (admin)
POST   /api/scholarship/awards           # Create award (admin)
GET    /api/scholarship/awards           # Get awards (admin)
POST   /api/scholarship/disbursements    # Create disbursement (admin)
```

## 🗄️ Data Models

### **Updated Models**
- **User**: Now supports Clerk integration with `clerkUserId` field
- **Wallet**: Matches mobile app structure with sendable/non-sendable balances
- **Transaction**: Supports all transaction types from mobile app
- **MiningSession**: Updated for real-time mining progress
- **ContactSubmission**: For website contact forms
- **NewsletterSubscription**: For website newsletter
- **MentorshipApplication**: For mentorship program
- **ScholarshipApplication**: For scholarship program

## 🔧 Key Features

### **Mobile App Integration**
- ✅ Clerk authentication webhooks
- ✅ Real-time mining progress tracking
- ✅ Sendable vs non-sendable token management
- ✅ Transaction history with proper types
- ✅ Wallet address management

### **Website Integration**
- ✅ Contact form processing
- ✅ Newsletter subscription management
- ✅ Mentorship application workflow
- ✅ Scholarship application with document uploads
- ✅ Admin panels for all website features

### **Security & Validation**
- ✅ Input validation for all endpoints
- ✅ Role-based access control
- ✅ Rate limiting and security headers
- ✅ Proper error handling

## 🚀 Next Steps

1. **Install Dependencies**: `npm install` in backend folder
2. **Environment Setup**: Configure `.env` with Clerk webhooks
3. **Database Setup**: MongoDB connection and initial data
4. **Testing**: Run tests to verify all endpoints
5. **Integration**: Connect mobile app and website to new endpoints

This API structure now perfectly matches the actual requirements of your celf-mobile and celf-website-2 projects!
