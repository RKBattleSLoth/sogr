# Testing Scripts

This directory contains scripts for testing various components of the application.

## Test Categories

### API Testing
- `test-api-endpoints.js` - Test all API endpoints
- `test-unified-search.js` - Test unified search functionality
- `test-semantic-search.js` - Test semantic search capabilities

### Database Testing
- `test-database-connections.js` - Test database connectivity
- `test-vector-db.js` - Test vector database operations

### Component Testing
- `test-graph-view.js` - Test graph visualization components
- `test-llm-service.js` - Test LLM service integration

## Usage

Run tests from project root:

```bash
# Example: Test unified search
npx tsx scripts/testing/test-unified-search.js
```