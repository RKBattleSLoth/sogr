# Smart Digital Rolodex

🧠 **AI-Powered Social Life Information Management System**

An intelligent application that transforms unstructured social interactions into a structured, searchable knowledge base. Leveraging the power of Large Language Models (LLMs) and graph visualization to help you navigate your social world with greater ease and insight.

## 🌟 Features

### 🤖 AI-Powered Processing
- **Natural Language Understanding**: Process unstructured text about people and interactions
- **Intelligent Information Extraction**: Automatically identify names, organizations, roles, and social media handles
- **Data Validation & Enrichment**: Cross-reference information with external sources for accuracy
- **Smart Context Analysis**: Understand relationships and connections between people and organizations

### 📊 Interactive Graph Visualization
- **Precise Node Interaction**: Accurate clicking and hover effects at any zoom level
- **Real-time Zoom & Pan**: Smooth navigation through your social network
- **Color-coded Nodes**: Visual distinction between people, organizations, interactions, and social media
- **Detailed Information Cards**: Rich data display on node selection

### 💾 Robust Data Management
- **Comprehensive Database Schema**: Support for people, organizations, roles, and interactions
- **Relationship Mapping**: Track professional connections, work history, and social media presence
- **Temporal Data**: Track when and where interactions occurred
- **Privacy-Focused**: Your data stays local and secure

### 🎨 Modern User Interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Intuitive Controls**: Easy-to-use zoom, pan, and selection tools
- **Real-time Feedback**: Immediate visual response to user interactions
- **Clean Aesthetics**: Professional design with shadcn/ui components

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite (included with Prisma)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RKBattleSLoth/smart-digital-rolodex.git
   cd smart-digital-rolodex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Push schema to database
   npm run db:push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

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

3. **Visualize Your Network**
   - Nodes appear automatically in the graph
   - Different colors represent different entity types
   - Connections show relationships between entities

### Navigating the Graph

- **Click nodes** to view detailed information
- **Hover** to see node highlights
- **Use zoom controls** to navigate large networks
- **Pan** by dragging the canvas

### Understanding the Visualization

- **🔵 Blue nodes**: People
- **🟡 Amber nodes**: Organizations  
- **🟢 Green nodes**: Interactions
- **🟣 Violet nodes**: Social Media accounts

## 🏗️ Architecture

### Multi-LLM Approach

The system employs a team of specialized Large Language Models, each optimized for specific tasks:

1. **Natural Language Understanding & Information Extraction**
   - Identifies entities and relationships in unstructured text
   - Outputs structured JSON data

2. **Data Validation & Enrichment**
   - Verifies extracted information against external sources
   - Enhances data with relevant contextual information

3. **Query Understanding & Response Generation**
   - Translates natural language questions into database queries
   - Generates human-readable responses from structured data

### Technical Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite with comprehensive schema
- **AI**: Large Language Models for natural language processing
- **Visualization**: HTML5 Canvas with precise coordinate transformation

### Database Schema

The system uses a sophisticated graph database model with:

- **People**: Names, contact info, bio, avatar
- **Organizations**: Company details, industry, website
- **Current Roles**: Present positions and affiliations
- **Previous Roles**: Work history and experience
- **Social Media Handles**: Platform-specific profile information
- **Interactions**: Meeting notes, context, timing, and location

## 🔧 Development

### Project Structure

```
src/
├── app/
│   ├── api/              # API endpoints
│   │   ├── smart-process/    # AI processing
│   │   ├── node-data/        # Data retrieval
│   │   └── interaction/      # Interaction management
│   └── page.tsx          # Main application
├── components/
│   ├── graph-view.tsx    # Interactive graph visualization
│   └── ui/               # shadcn/ui components
└── lib/
    ├── db/               # Database connection
    └── auth/             # Authentication configuration
```

### Key Components

#### Graph View (`src/components/graph-view.tsx`)
- Canvas-based network visualization
- Precise coordinate transformation
- Stable node positioning
- Interactive zoom and pan controls

#### Smart Process API (`src/app/api/smart-process/route.ts`)
- Natural language processing
- Information extraction and validation
- Database integration
- Error handling and logging

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio (if installed)
```

## 🧪 Testing

The project includes comprehensive test scripts:

- **Graph Visualization**: `test-graph-view.js`
- **Node Interaction**: `test-node-dialog.js`
- **Enhanced Features**: `test-enhanced-graph.js`
- **API Endpoints**: Various test files for different components

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

- [ ] Real-time collaboration features
- [ ] Mobile application
- [ ] Advanced analytics and insights
- [ ] Integration with popular social platforms
- [ ] Enhanced privacy controls
- [ ] Export/import functionality
- [ ] Advanced search and filtering

---

**Built with ❤️ using Next.js, Prisma, and modern AI technologies**

For questions, suggestions, or issues, please open an issue on the GitHub repository.