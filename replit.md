# Video Content Agent

## Overview

This project is a TypeScript-based intelligent video content automation agent built with the Mastra framework. The system searches for trending videos across social platforms (YouTube, TikTok, Instagram), analyzes their content and metrics, and generates original Russian-language video scripts inspired by successful viral content. The agent integrates with Telegram for user interaction, uses Inngest for workflow orchestration, and stores data in PostgreSQL.

**Key Features:**
- Multi-platform video discovery and trending analysis
- AI-powered content analysis and script generation
- Telegram bot interface for user interactions
- Workflow automation using Inngest
- PostgreSQL database for session management and content storage

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Framework
- **Runtime**: Node.js (>=20.9.0) with TypeScript
- **Framework**: Mastra - comprehensive toolkit for building AI agents
- **Orchestration**: Inngest - handles workflow execution and task sequencing
- **AI Model**: OpenAI GPT-4o for content generation and analysis

### Application Structure
The system follows a modular agent-based architecture:

**Triggers (`src/triggers/`)**: Entry points that handle external events
- Telegram webhook handlers for bot interactions
- API route registration for external service integration

**Workflows (`src/mastra/workflows/`)**: High-level business logic orchestration
- `telegramContentWorkflow.ts` - Main workflow that processes user messages through the agent

**Agents (`src/mastra/agents/`)**: The core intelligence layer
- `videoContentAgent.ts` - Central agent containing instructions and tool coordination

**Tools (`src/mastra/tools/`)**: Specialized functionality modules
- `videoSearchTools.ts` - Multi-platform video discovery
- `contentAnalysisTools.ts` - Video transcription and metrics analysis
- `scriptGenerationTools.ts` - AI-powered script creation
- `databaseTools.ts` - Session and data management
- `telegramTools.ts` - Bot messaging capabilities

### Data Architecture
- **Database**: PostgreSQL with session-based data organization
- **Storage Layer**: Mastra PostgreSQL store for persistent data
- **Schema**: User sessions, found videos, scripts, and activity logging

### Workflow Pattern
1. User sends message via Telegram
2. Workflow extracts context and routes to Video Content Agent
3. Agent analyzes request and selects appropriate tools
4. Tools execute searches, analysis, and generation tasks
5. Results are processed and returned to user via Telegram

### Implementation Status
**Production Ready:**
- Database operations and session management
- Telegram bot integration and messaging
- Workflow orchestration infrastructure
- Metrics analysis algorithms

**Stub Implementations (Require Integration):**
- Video search APIs (YouTube, TikTok, Instagram)
- Video transcription services
- AI script generation (currently uses templates)
- HeyGen video creation integration
- Blotato social media publishing

## External Dependencies

### Required Services
- **OpenAI API**: GPT-4o model for content analysis and script generation
- **PostgreSQL Database**: Data persistence and session management
- **Telegram Bot API**: User interface and bot interactions

### Planned Integrations
- **YouTube Data API**: Video search and metadata retrieval
- **TikTok API**: Trending content discovery
- **Instagram API**: Short-form video analysis
- **OpenAI Whisper**: Video transcription services
- **HeyGen API**: AI video generation platform
- **Blotato API**: Multi-platform social media publishing
- **Pipedream**: VK publishing integration

### Development Tools
- **Inngest**: Workflow orchestration and event handling
- **Mastra Framework**: Agent development and tool integration
- **TypeScript**: Type safety and development experience
- **Pino**: Structured logging