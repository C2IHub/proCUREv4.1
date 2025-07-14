# AWS Strands Migration - Architecture Documentation

## Overview

This document describes the migration from legacy TypeScript agent classes to the new AWS Strands framework for the proCURE platform.

## Architecture Changes

### Before: Legacy Agent System
```
Frontend (React) → Legacy Agent Classes (TypeScript) → Complex Prompt Building → Direct LLM Calls
```

### After: AWS Strands System
```
Frontend (React) → Strands API Layer → AWS Lambda Functions → Bedrock Agents → Enhanced Responses
```

## Key Components

### 1. AWS Strands Agents
Located in `/agents/strands/`, each agent is defined by:
- **agent.yaml**: Declarative configuration defining capabilities, guardrails, and behavior
- **index.ts**: Generic Lambda handler for AWS deployment
- **deployment.json**: AWS infrastructure configuration

**Available Agents:**
- `compliance-monitor`: EU GMP compliance analysis and certification tracking
- `risk-predictor`: Multi-factor risk assessment and prediction  
- `document-intelligence`: Document validation and authenticity verification

### 2. Strands API Layer (`src/api/strandsApi.ts`)
- Provides unified interface for calling AWS Strands agents
- Automatically falls back to mock implementations when AWS endpoints unavailable
- Supports both API Gateway endpoints and direct AWS SDK calls
- Handles authentication, error handling, and response caching

### 3. Environment Configuration
```bash
# AWS Strands Agent Endpoints (API Gateway)
VITE_COMPLIANCE_MONITOR_ENDPOINT=https://api.gateway.url/compliance-monitor
VITE_RISK_PREDICTOR_ENDPOINT=https://api.gateway.url/risk-predictor
VITE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://api.gateway.url/document-intelligence

# Bedrock Agent IDs (for direct calls)
VITE_COMPLIANCE_MONITOR_AGENT_ID=your_compliance_agent_id
VITE_RISK_PREDICTOR_AGENT_ID=your_risk_agent_id
VITE_DOCUMENT_INTELLIGENCE_AGENT_ID=your_document_agent_id

# Environment control
VITE_USE_MOCK_API=true  # Set to false in production
```

### 4. Frontend Integration
- React components unchanged - all UI functionality preserved
- Updated API hooks in `src/hooks/useApi.ts` to use new Strands API
- Simplified context provider (`StrandsSystemProvider`) replaces complex agent orchestration
- Mock fallbacks ensure local development works without AWS access

## Deployment Architecture

### AWS Strands Agents
Each agent deploys as:
1. **Lambda Function** with generic handler
2. **API Gateway** endpoint for HTTP access
3. **Bedrock Agent** with YAML-defined capabilities
4. **Knowledge Bases** for enhanced context
5. **CloudWatch** monitoring and logging

### Local Development
- Mock implementations activated when `VITE_USE_MOCK_API=true`
- Full UI functionality available without AWS dependencies
- Realistic mock responses based on agent capabilities

## Benefits of Migration

### 1. Simplified Architecture
- Declarative YAML configuration instead of complex TypeScript classes
- Generic Lambda handlers reduce code complexity
- Standardized deployment patterns across all agents

### 2. Better Scalability
- AWS Bedrock handles resource management and scaling
- Built-in rate limiting and cost controls
- Automatic failover and health monitoring

### 3. Easier Maintenance
- Configuration changes don't require code deployment
- Centralized monitoring and logging
- Consistent patterns across all agents

### 4. Enhanced Capabilities
- Built-in guardrails and security validation
- Web search integration for real-time data
- Knowledge base integration for contextual responses
- Advanced prompt engineering through YAML instructions

## Development Workflow

### Local Development
1. Set `VITE_USE_MOCK_API=true` in environment
2. Run `npm run dev` - application uses mock implementations
3. All UI features work without AWS dependencies

### Production Deployment
1. Deploy Strands agents using `npm run deploy:strands`
2. Configure API Gateway endpoints in environment variables
3. Set `VITE_USE_MOCK_API=false`
4. Application automatically uses deployed agents

### Testing
1. **Unit Tests**: Mock implementations ensure consistent testing
2. **Integration Tests**: Can test against real or mock agents
3. **E2E Tests**: Full application testing with mock backend

## Migration Benefits

### Removed Dependencies
- Complex TypeScript agent orchestration classes
- Legacy Bedrock SDK integrations
- Manual prompt building and validation logic
- Custom rate limiting and caching implementations

### Added Capabilities
- Declarative agent configuration
- Built-in security and guardrails
- Standardized monitoring and logging
- Automatic scaling and resource management
- Enhanced error handling and fallbacks

## Future Enhancements

### Phase 1: Enhanced Integration
- Real-time agent health monitoring
- Advanced caching strategies
- Cross-agent workflow orchestration

### Phase 2: Advanced Features
- Multi-agent collaboration
- Custom knowledge base integration
- Real-time streaming responses

### Phase 3: Intelligence Layer
- Predictive analytics integration
- Automated compliance reporting
- Advanced risk modeling

## Monitoring and Maintenance

### CloudWatch Dashboards
- Agent performance metrics
- Cost tracking and optimization
- Error rates and latency monitoring

### Health Checks
- Automated agent health monitoring
- Fallback activation on failures
- Performance degradation alerts

### Cost Management
- Usage tracking and budget alerts
- Resource optimization recommendations
- Rate limiting and throttling controls