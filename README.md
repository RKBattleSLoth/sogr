# SOGR - Social Graph Intelligence

🧠 **Advanced AI-Powered Social Life Information Management System**

A sophisticated intelligence platform that transforms unstructured social interactions into a structured, searchable knowledge base. Featuring cutting-edge unified search, semantic search, and multi-LLM processing to help you navigate your social world with unprecedented insight and efficiency.

## 🌟 Features

### 🔍 Unified Search System
- **Intelligent Query Processing**: Handles complex, multi-part queries with context awareness
- **Hybrid Search Strategy**: Combines traditional database queries with semantic vector search
- **LLM-Powered Summarization**: Provides intelligent, context-aware responses to complex questions
- **Multi-Pattern Recognition**: Supports diverse query types including workplace, social media, and relationship queries

### 🧠 Semantic Search Capabilities
- **Vector-Based Search**: Advanced embedding-based search for finding related concepts and people
- **Intelligent Matching**: Finds connections beyond exact text matches
- **Context-Aware Results**: Understands the meaning and intent behind queries
- **Relationship Discovery**: Uncovers hidden connections in your social network

### 🤖 Advanced AI Processing
- **Multi-LLM Architecture**: Specialized agents for extraction, validation, and response generation
- **Natural Language Understanding**: Processes complex narratives about social interactions
- **Intelligent Information Extraction**: Identifies entities, relationships, and temporal information
- **Data Validation & Enrichment**: Cross-references and enhances extracted information

### 📊 Interactive Graph Visualization
- **Enhanced Node Interaction**: Click any node for detailed information dialogs
- **Dual View Modes**: Switch between user-friendly formatted view and technical raw data view
- **Real-time Zoom & Pan**: Smooth navigation through your social network
- **Color-coded Nodes**: Visual distinction between people, organizations, interactions, and social media
- **Debugging Tools**: Complete transparency into AI data processing and storage

### 💾 Enterprise-Grade Data Management
- **Comprehensive Database Schema**: Support for people, organizations, roles, interactions, and social media
- **Relationship Mapping**: Track professional connections, work history, and social media presence
- **Temporal Data**: Track when and where interactions occurred
- **Privacy-Focused**: Your data stays local and secure
- **Data Integrity**: Robust validation and error handling

### 🎨 Modern User Interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Intuitive Controls**: Easy-to-use zoom, pan, and selection tools
- **Real-time Feedback**: Immediate visual response to user interactions
- **Professional Aesthetics**: Clean design with shadcn/ui components and glassmorphism effects

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite (included with Prisma)
- AI Service API keys (for LLM processing)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/RKBattleSLoth/sogr.git
   cd sogr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your AI service API keys
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npm run db:push
   
   # (Optional) Seed with sample data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

### One-Command Setup

For a complete setup with all dependencies:
```bash
npm run setup
```

## 📚 Usage Guide

### Adding Social Interactions

1. **Enter Natural Language Input**
   ```
   "Today I met Felix, the CEO of the Think Foundation, he used to work at Proof and Moonbirds, and his twitter handle is @lefclicksave"
   ```

2. **AI Processing**
   - The system automatically extracts:
     - Person names and roles
     - Organizations and affiliations
     - Social media handles
     - Interaction context and timing
   - Multi-LLM validation ensures data accuracy

3. **Visualize Your Network**
   - Nodes appear automatically in the graph
   - Different colors represent different entity types
   - Connections show relationships between entities

### Advanced Search Capabilities

#### Unified Search
Ask complex, multi-part questions:
```
"Where does Mikey Anderson work and what are his thoughts on building?"
"Who works at Think and what are their roles?"
"Tell me about Felix and his professional background"
```

#### Semantic Search
Find related concepts and people:
```
"Find people with experience in startups"
"Show me connections in the tech industry"
"Who has worked with multiple organizations?"
```

### Navigating the Graph

- **Click nodes** to view detailed information with dual view modes
- **Formatted View**: User-friendly display of key information
- **Raw Data View**: Complete database records for debugging
- **Hover** to see node highlights
- **Use zoom controls** to navigate large networks
- **Pan** by dragging the canvas

### Understanding the Visualization

- **🔵 Blue nodes**: People (largest, most important)
- **🟡 Amber nodes**: Organizations (medium size)
- **🟢 Green nodes**: Interactions (smaller)
- **🟣 Violet nodes**: Social Media accounts (smallest)

### Connection Types

- **Thick amber lines**: Current employment relationships
- **Thin amber lines**: Previous work history
- **Violet lines**: Social media connections
- **Green lines**: Interaction records

## 🏗️ Architecture

### Multi-Agent LLM Architecture

The system employs a team of specialized Large Language Models, each optimized for specific tasks:

#### 1. Natural Language Understanding & Information Extraction Agent
- **Responsibility**: Parse unstructured input, identify entities and relationships
- **Capabilities**: Named Entity Recognition, Relationship Extraction, Temporal expression recognition
- **Output**: Structured JSON with extracted entities and relationships

#### 2. Data Validation & Enrichment Agent
- **Responsibility**: Verify extracted information and enhance with additional context
- **Capabilities**: Fact-checking, data consistency validation, confidence scoring
- **Output**: Validated and enriched data structure

#### 3. Query Understanding & Generation Agent
- **Responsibility**: Translate natural language queries into database queries
- **Capabilities**: Intent recognition, entity identification, complex query generation
- **Output**: Formal database queries with semantic search integration

#### 4. Response Generation Agent
- **Responsibility**: Transform query results into natural language responses
- **Capabilities**: Result summarization, context-aware formatting, conversational tone
- **Output**: Fluent, contextually relevant natural language responses

### Unified Search System

#### Hybrid Search Strategy
- **Traditional Database Queries**: Exact matches for structured data
- **Semantic Vector Search**: Embedding-based search for conceptual matches
- **LLM-Powered Summarization**: Intelligent synthesis of multiple data sources
- **Result Fusion**: Intelligent combination of different search results

#### Query Processing Pipeline
```
User Query → Pattern Matching → Query Strategy Selection → Parallel Execution → Result Fusion → LLM Summarization → Response
```

### Technical Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite with comprehensive schema (designed for graph migration)
- **AI Services**: Multiple LLM providers for specialized tasks
- **Vector Search**: Embedding-based semantic search capabilities
- **Visualization**: HTML5 Canvas with precise coordinate transformation

### Database Schema

The system uses a sophisticated graph database model with:

- **People**: Names, contact info, bio, avatar, social connections
- **Organizations**: Company details, industry, website, employee relationships
- **Current Roles**: Present positions and affiliations with temporal data
- **Previous Roles**: Work history and experience with timeline information
- **Social Media Handles**: Platform-specific profile information with verification
- **Interactions**: Meeting notes, context, timing, location, and participant data

## 🔧 Development

### Project Structure

```
src/
├── app/
│   ├── api/                          # API endpoints
│   │   ├── unified-search/           # Advanced search system
│   │   ├── semantic-search/          # Vector-based search
│   │   ├── query/                    # Traditional query processing
│   │   ├── interaction/              # Interaction management
│   │   ├── import/                   # Data import utilities
│   │   └── test-db/                  # Database testing utilities
│   ├── page.tsx                      # Main application
│   ├── layout.tsx                    # Application layout
│   └── globals.css                   # Global styles
├── components/
│   ├── unified-search.tsx            # Advanced search interface
│   ├── graph-view.tsx                # Interactive graph visualization
│   ├── semantic-search.tsx           # Semantic search interface
│   ├── connection-dashboard.tsx      # Connection management
│   ├── import-dashboard.tsx          # Data import interface
│   ├── test-data-inspector.tsx       # Data debugging tools
│   └── ui/                           # shadcn/ui components
└── lib/
    ├── services/                     # External service integrations
    │   ├── llm.ts                    # LLM service management
    │   ├── gmail.ts                  # Gmail integration
    │   ├── outlook.ts                # Outlook integration
    │   └── external-connections.ts   # External API management
    ├── db.ts                         # Database connection
    ├── vector-client.ts              # Vector search client
    ├── vector-db.ts                  # Vector database operations
    ├── query-analyzer.ts             # Query analysis and rewriting
    ├── search-strategy.ts            # Search strategy selection
    ├── result-fusion.ts              # Result combination logic
    └── utils.ts                      # Utility functions

docs/
├── setup/                            # Setup and installation guides
├── api/                              # API documentation
├── architecture/                     # System architecture documentation
└── PRD.md                           # Product Requirements Document

scripts/
├── development/                      # Development utilities
└── testing/                          # Test scripts
```

### Key Components

#### Unified Search System (`src/app/api/unified-search/route.ts`)
- Hybrid query processing with multiple search strategies
- LLM-powered result summarization
- Intelligent pattern matching and query rewriting
- Real-time result fusion from multiple data sources

#### Semantic Search (`src/app/api/semantic-search/route.ts`)
- Vector-based embedding search
- Conceptual matching beyond exact text
- Integration with traditional database queries
- Advanced similarity scoring

#### Enhanced Graph View (`src/components/graph-view.tsx`)
- Interactive node dialogs with dual view modes
- Real-time data fetching and display
- Advanced debugging capabilities with raw data access
- Professional visualization with precise interaction

#### LLM Service Integration (`src/lib/services/llm.ts`)
- Multi-LLM provider support
- Specialized agent management
- Error handling and fallback mechanisms
- Performance optimization with caching

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking

# Database
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (if installed)
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database to clean state

# Setup & Maintenance
npm run setup        # Complete setup process
npm run clean        # Clean development artifacts
npm run validate     # Validate setup and dependencies

# Testing
npm run test:api     # Test API endpoints
npm run test:search  # Test search functionality
npm run test:ui      # Test UI components
```

## 🧪 Testing

The project includes comprehensive testing infrastructure:

### Automated Testing
- **API Testing**: `scripts/testing/test-api.js` - Comprehensive API endpoint validation
- **Search Testing**: `scripts/testing/test-search.js` - Unified and semantic search validation
- **UI Testing**: `scripts/testing/test-ui.js` - Component interaction testing
- **Database Testing**: `scripts/testing/test-database.js` - Data integrity validation

### Manual Testing Tools
- **Search Validation**: Interactive testing of complex queries
- **Data Import Testing**: Validation of email and data import functionality
- **Graph Interaction**: Node clicking, dialog functionality, and zoom/pan testing
- **LLM Integration**: AI processing accuracy and response quality testing

### Test Coverage
- **Unit Tests**: Individual component functionality
- **Integration Tests**: End-to-end workflow validation
- **Performance Tests**: Response time and scalability testing
- **Error Handling**: Robustness under various failure conditions

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api
npm run test:search
npm run test:ui
npm run test:database

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the excellent framework
- **Prisma** for the modern database toolkit
- **shadcn/ui** for the beautiful component library
- **Large Language Model** providers for the AI capabilities

## 🔮 Future Enhancements

### Near-Term (Next Release)
- [ ] **Email Integration**: Full Gmail and Outlook integration with automated processing
- [ ] **Real-time Collaboration**: Multi-user support with shared knowledge bases
- [ ] **Advanced Analytics**: Network analysis and relationship strength metrics
- [ ] **Mobile Application**: Native iOS and Android apps

### Medium-Term
- [ ] **Social Media Integration**: Automated data extraction from Twitter, LinkedIn
- [ ] **Enhanced Privacy Controls**: Granular data sharing and privacy settings
- [ ] **Export/Import Functionality**: Data portability and backup capabilities
- [ ] **Advanced Search Filters**: Sophisticated filtering and search operators

### Long-Term Vision
- [ ] **Predictive Intelligence**: AI-powered insights and recommendations
- [ ] **Team Collaboration**: Enterprise features for team-based social intelligence
- [ ] **API Ecosystem**: Public API for third-party integrations
- [ ] **Machine Learning**: Continuous improvement through user feedback

### Research & Development
- [ ] **Advanced NLP**: More sophisticated natural language understanding
- [ ] **Knowledge Graph**: Enhanced graph algorithms and visualization
- [ ] **Multi-modal AI**: Integration of text, image, and voice processing
- [ ] **Blockchain**: Optional decentralized data storage

---

**Built with ❤️ using Next.js, Prisma, and modern AI technologies**

For questions, suggestions, or issues, please open an issue on the GitHub repository.