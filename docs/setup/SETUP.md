# SOGR Setup Guide

## 🚀 Quick Start

This guide will help you set up SOGR (Social Graph Intelligence) on your local machine.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download Git](https://git-scm.com/)
- **AI Service API Keys** - OpenAI or Anthropic API key

### Step 1: Clone the Repository

```bash
git clone https://github.com/RKBattleSLoth/sogr.git
cd sogr
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
# Required: AI Service Configuration
LLM_PROVIDER="openai"
LLM_API_KEY="your-openai-api-key-here"
LLM_MODEL="gpt-4-turbo-preview"

# Alternative LLM Provider (fallback)
FALLBACK_LLM_PROVIDER="anthropic"
FALLBACK_LLM_API_KEY="your-anthropic-api-key-here"
FALLBACK_LLM_MODEL="claude-3-sonnet-20240229"

# Required: Vector Search Configuration
VECTOR_PROVIDER="openai"
VECTOR_API_KEY="your-openai-api-key-here"
VECTOR_MODEL="text-embedding-3-small"

# Required: Database Configuration
DATABASE_URL="file:./dev.db"

# Required: Authentication
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 4: Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### Step 5: Start Development Server

```bash
npm run dev
```

### Step 6: Verify Installation

Open your browser and navigate to `http://localhost:3000`. You should see:

- ✅ The SOGR application interface
- ✅ Graph visualization with sample data (if seeded)
- ✅ Search functionality working
- ✅ All API endpoints responding

## 🔧 Detailed Setup

### AI Service Configuration

#### Option 1: OpenAI (Recommended)

1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to your `.env` file:

```env
LLM_PROVIDER="openai"
LLM_API_KEY="sk-your-openai-key"
LLM_MODEL="gpt-4-turbo-preview"

FALLBACK_LLM_PROVIDER="anthropic"
FALLBACK_LLM_API_KEY="your-anthropic-key"
FALLBACK_LLM_MODEL="claude-3-sonnet-20240229"

VECTOR_PROVIDER="openai"
VECTOR_API_KEY="sk-your-openai-key"
VECTOR_MODEL="text-embedding-3-small"
```

#### Option 2: Anthropic Claude

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to your `.env` file:

```env
LLM_PROVIDER="anthropic"
LLM_API_KEY="your-anthropic-key"
LLM_MODEL="claude-3-sonnet-20240229"

FALLBACK_LLM_PROVIDER="openai"
FALLBACK_LLM_API_KEY="sk-your-openai-key"
FALLBACK_LLM_MODEL="gpt-4-turbo-preview"

VECTOR_PROVIDER="openai"  # Still need OpenAI for embeddings
VECTOR_API_KEY="sk-your-openai-key"
VECTOR_MODEL="text-embedding-3-small"
```

### Database Setup

#### SQLite (Default)

The default configuration uses SQLite, which requires no additional setup:

```env
DATABASE_URL="file:./dev.db"
```

#### PostgreSQL (Production)

For production, consider PostgreSQL:

1. Install PostgreSQL
2. Create a database:

```sql
CREATE DATABASE sogr;
CREATE USER sogr_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE sogr TO sogr_user;
```

3. Update your `.env`:

```env
DATABASE_URL="postgresql://sogr_user:your_password@localhost:5432/sogr"
```

### Authentication Setup

#### Development Mode

For development, you can use the default configuration:

```env
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:

```bash
openssl rand -base64 32
```

#### Production Authentication

For production, configure OAuth providers:

```env
# GitHub OAuth
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### External Integrations (Optional)

#### Gmail Integration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add to `.env`:

```env
GMAIL_CLIENT_ID="your-gmail-client-id"
GMAIL_CLIENT_SECRET="your-gmail-client-secret"
GMAIL_REDIRECT_URI="http://localhost:3000/api/auth/gmail/callback"
```

#### Outlook Integration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add Microsoft Graph API permissions
4. Add to `.env`:

```env
OUTLOOK_CLIENT_ID="your-outlook-client-id"
OUTLOOK_CLIENT_SECRET="your-outlook-client-secret"
OUTLOOK_REDIRECT_URI="http://localhost:3000/api/auth/outlook/callback"
```

## 🧪 Testing Your Setup

### Run Validation Script

```bash
npm run validate
```

This script checks:
- ✅ Node.js version compatibility
- ✅ Dependencies installation
- ✅ Environment variables configuration
- ✅ Database connection
- ✅ AI service connectivity
- ✅ API endpoints functionality

### Manual Testing

#### Test Database Connection

```bash
npm run db:studio
```

This opens Prisma Studio to inspect your database.

#### Test Search Functionality

1. Open `http://localhost:3000`
2. Try these test queries:
   - "Where does Mikey Anderson work?"
   - "Who works at Think?"
   - "Tell me about Felix"
   - "What is John's Twitter?"

#### Test Graph Visualization

1. Click on the "Graph View" tab
2. Click on any node to see detailed information
3. Try zooming and panning
4. Test the formatted vs raw data views

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: `Error: Database connection failed`

**Solution**:
```bash
# Check if database file exists
ls -la dev.db

# Reset database
npm run db:reset

# Check permissions
chmod 644 dev.db
```

#### AI Service Errors

**Problem**: `Error: Invalid API key`

**Solution**:
1. Verify your API key is correct
2. Check if the API key has sufficient credits
3. Test the API key directly:

```bash
curl -H "Authorization: Bearer your-api-key" https://api.openai.com/v1/models
```

#### Build Errors

**Problem**: TypeScript compilation errors

**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

#### Port Already in Use

**Problem**: `Error: Port 3000 is already in use`

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Performance Issues

#### Slow Search Responses

**Solution**:
1. Check your internet connection
2. Verify AI service response times
3. Enable caching in `.env`:

```env
CACHE_TTL="3600"
CACHE_MAX_SIZE="1000"
```

#### Memory Issues

**Solution**:
1. Increase Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

2. Close unused applications
3. Consider using a lighter database for development

## 🚀 Production Deployment

### Environment Setup

1. Create production `.env` file:

```bash
cp .env.example .env.production
```

2. Update production settings:

```env
NODE_ENV="production"
NEXTAUTH_URL="https://your-domain.com"
DATABASE_URL="postgresql://user:pass@host:port/db"
LOG_LEVEL="warn"
```

### Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Database Migration

```bash
# Generate production database
npx prisma generate

# Push schema to production database
npm run db:push

# (Optional) Run migrations
npx prisma migrate deploy
```

### Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **API Keys**: Use a secret management service in production
3. **Database**: Use strong passwords and SSL connections
4. **Authentication**: Configure proper OAuth providers
5. **CORS**: Restrict allowed origins

## 📚 Additional Resources

### Documentation

- [API Documentation](../api/README.md)
- [Architecture Overview](../architecture/README.md)
- [Product Requirements](../PRD.md)

### Community

- [GitHub Issues](https://github.com/RKBattleSLoth/sogr/issues)
- [Discussions](https://github.com/RKBattleSLoth/sogr/discussions)
- [Wiki](https://github.com/RKBattleSLoth/sogr/wiki)

### Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information
4. Include your environment details and error messages

---

**Happy building! 🎉**