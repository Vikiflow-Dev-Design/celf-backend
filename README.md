# CELF Backend API

A professional Node.js backend API for the CELF project built with Express.js and Supabase, designed specifically for the **celf-mobile** and **celf-website-2** applications.

## 🚀 Features

- **Supabase Database**: PostgreSQL database with real-time capabilities
- **No Authentication**: Authentication disabled for development - all endpoints accessible
- **Mining System**: Real-time mining progress tracking for mobile app (mock data)
- **Wallet Management**: Sendable/non-sendable token balance management (mock data)
- **Website Forms**: Contact, newsletter, mentorship, and scholarship applications (mock responses)
- **Email Service**: Automated emails for notifications and confirmations
- **Security**: Rate limiting, CORS, helmet, input validation
- **Error Handling**: Centralized error handling with detailed logging
- **API Documentation**: RESTful API with standardized responses
- **Testing**: Jest testing framework setup
- **Code Quality**: ESLint and Prettier configuration

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── config.js              # Application configuration
│   ├── controllers/
│   │   ├── authController.js      # Authentication logic
│   │   ├── userController.js      # User management
│   │   └── miningController.js    # Mining operations
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT authentication
│   │   ├── errorMiddleware.js     # Error handling
│   │   └── validationMiddleware.js # Request validation
│   ├── models/
│   │   ├── User.js               # User data model
│   │   └── MiningSession.js      # Mining session model
│   ├── routes/
│   │   ├── index.js              # Main router
│   │   ├── authRoutes.js         # Authentication routes
│   │   ├── userRoutes.js         # User routes
│   │   └── miningRoutes.js       # Mining routes
│   ├── services/
│   │   ├── emailService.js       # Email functionality
│   │   └── miningService.js      # Mining operations
│   ├── utils/
│   │   ├── responseUtils.js      # API response helpers
│   │   └── tokenUtils.js         # JWT utilities
│   └── server.js                 # Application entry point
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Supabase setup**
   - Create a new Supabase project at https://supabase.com
   - Run the SQL schema in `supabase/schema.sql` in your Supabase SQL editor
   - Update Supabase credentials in `.env`

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Required Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)
- `JWT_SECRET`: JWT signing secret
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Optional Variables
- `EMAIL_*`: Email service configuration
- `REDIS_*`: Redis configuration for caching
- `FRONTEND_URL`: Frontend application URL

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email address

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/change-password` - Change password
- `DELETE /api/users/account` - Delete account

### Mining
- `GET /api/mining` - Get user's mining sessions
- `POST /api/mining` - Create new mining session
- `GET /api/mining/:id` - Get specific mining session
- `PUT /api/mining/:id` - Update mining session
- `DELETE /api/mining/:id` - Delete mining session
- `POST /api/mining/:id/start` - Start mining
- `POST /api/mining/:id/pause` - Pause mining
- `POST /api/mining/:id/stop` - Stop mining
- `GET /api/mining/:id/results` - Get mining results
- `GET /api/mining/:id/analytics` - Get mining analytics

### Admin Routes
- `GET /api/users` - Get all users (admin only)
- `GET /api/mining/admin/all` - Get all mining sessions (admin only)
- `GET /api/mining/admin/stats` - Get mining statistics (admin only)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development

```bash
# Start development server with auto-reload
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Prevent abuse with configurable limits
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers middleware
- **Input Validation**: Request validation with express-validator
- **Error Handling**: Secure error responses without sensitive data

## 📊 Monitoring & Logging

- **Morgan**: HTTP request logging
- **Custom Logging**: Application-specific logging
- **Health Check**: `/health` endpoint for monitoring
- **Error Tracking**: Centralized error handling and logging

## 🚀 Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Configure production database
   - Set secure JWT secrets
   - Configure email service

2. **Build & Start**
   ```bash
   npm install --production
   npm start
   ```

3. **Process Management**
   - Use PM2 or similar for process management
   - Configure reverse proxy (nginx)
   - Set up SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Note**: This is a professional backend structure designed for scalability and maintainability. Make sure to configure all environment variables and security settings before deploying to production.
