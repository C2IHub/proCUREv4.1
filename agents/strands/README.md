# AWS Strands Agent Builder Implementation

This directory contains the AWS Strands agent builder implementation for the proCURE platform. The Strands approach moves from code-defined agents to configuration-defined agents, using declarative YAML files and generic Lambda handlers.

## Architecture Overview

### Traditional Approach vs. Strands Approach

**Traditional (Before):**
```
TypeScript Class → Complex Logic → Direct Execution
```

**Strands Approach (After):**
```
YAML Configuration → Generic Lambda Handler → AWS Bedrock Agent → Response
```

## Directory Structure

```
agents/strands/
├── compliance-monitor/
│   ├── agent.yaml          # Agent configuration and capabilities
│   ├── index.ts           # Generic Lambda handler
│   └── deployment.json    # AWS deployment configuration
├── risk-predictor/
│   ├── agent.yaml
│   ├── index.ts
│   └── deployment.json
└── document-intelligence/
    ├── agent.yaml
    ├── index.ts
    └── deployment.json
```

## Key Benefits

1. **Declarative Configuration**: Agent behavior defined in YAML instead of TypeScript code
2. **Simplified Deployment**: Generic Lambda handlers reduce code complexity
3. **Better Scalability**: AWS Bedrock handles execution with proper resource management
4. **Easier Maintenance**: Configuration changes don't require code deployment
5. **Consistent Architecture**: All agents follow the same pattern

## Agent Configurations

### 1. Compliance Monitor Agent (`compliance-monitor`)
- **Purpose**: EU GMP compliance analysis and certification tracking
- **Capabilities**: Regulatory analysis, certification tracking, audit management
- **Knowledge Bases**: Regulatory guidance, compliance standards
- **Web Search**: EMA, FDA, ICH, ISO regulatory sites

### 2. Risk Predictor Agent (`risk-predictor`)
- **Purpose**: Multi-factor risk assessment and prediction
- **Capabilities**: Financial, operational, quality, supply chain risk analysis
- **Knowledge Bases**: Financial data, risk models, market intelligence
- **Web Search**: Financial news and market data sources

### 3. Document Intelligence Agent (`document-intelligence`)
- **Purpose**: Document validation and authenticity verification
- **Capabilities**: Document validation, compliance verification, fraud detection
- **Knowledge Bases**: Document templates, fraud patterns, compliance requirements
- **Web Search**: Regulatory authorities and verification databases

## Migration Strategy

The migration preserves all existing functionality while adopting the Strands pattern:

1. **Existing TypeScript classes** become clients that call deployed Lambda functions
2. **Complex prompt building logic** moves to YAML instructions
3. **Validation logic** moves to YAML guardrails
4. **Agent capabilities** defined in YAML action_groups
5. **Mock implementations** retained for development fallback

## Deployment

Each agent can be deployed independently using the configuration in `deployment.json`:

1. **Lambda Function**: Generic handler for agent execution
2. **API Gateway**: RESTful endpoint for agent invocation
3. **IAM Roles**: Secure access to Bedrock and knowledge bases
4. **CloudWatch**: Monitoring and logging
5. **Knowledge Bases**: S3-backed vector stores for context

## Environment Variables

Required environment variables for each agent:

```bash
# Compliance Monitor
COMPLIANCE_MONITOR_AGENT_ID=<bedrock-agent-id>
COMPLIANCE_MONITOR_AGENT_ALIAS_ID=<alias-id>

# Risk Predictor  
RISK_PREDICTOR_AGENT_ID=<bedrock-agent-id>
RISK_PREDICTOR_AGENT_ALIAS_ID=<alias-id>

# Document Intelligence
DOCUMENT_INTELLIGENCE_AGENT_ID=<bedrock-agent-id>
DOCUMENT_INTELLIGENCE_AGENT_ALIAS_ID=<alias-id>

# Common
BEDROCK_REGION=us-east-1
NODE_ENV=production
```

## API Endpoints

Each deployed agent exposes these endpoints:

- `POST /invoke` - Invoke the agent with a prompt
- `GET /health` - Health check endpoint

### Request Format

```json
{
  "prompt": "Analyze compliance status for Supplier ABC",
  "sessionId": "optional-session-id",
  "context": {
    "supplierId": "SUP-001",
    "supplierName": "ABC Pharmaceuticals",
    "region": "EU"
  }
}
```

### Response Format

```json
{
  "response": "Detailed agent response...",
  "sessionId": "session-123",
  "confidence": 0.95,
  "sources": ["EU GMP Guidelines", "FDA Regulations"],
  "trace": "optional-debug-info"
}
```

## Integration with Existing Code

The existing TypeScript agent classes are refactored to become clients:

```typescript
// Before: Complex agent logic in TypeScript
protected async executeAgent(prompt: string, request: AgentInvokeRequest): Promise<unknown> {
  // Lots of complex logic here...
}

// After: Simple API call to deployed agent
protected async executeAgent(prompt: string, request: AgentInvokeRequest): Promise<unknown> {
  if (!this.apiEndpoint) {
    return this.generateMockResponse(prompt, request); // Fallback
  }
  
  const response = await axios.post(this.apiEndpoint, {
    prompt,
    sessionId: request.sessionId,
    context: request.context
  });
  
  return response.data;
}
```

## Development vs. Production

- **Development**: Uses mock implementations when API endpoints not configured
- **Production**: Uses deployed AWS Bedrock agents via API Gateway
- **Hybrid**: Can mix real and mock agents for testing

## Monitoring

Each agent includes comprehensive monitoring:

- **CloudWatch Dashboards**: Performance metrics and usage statistics
- **Alarms**: High error rates, latency, and cost thresholds
- **Logs**: Detailed execution logs for debugging
- **Health Checks**: Automated health monitoring

## Security

Security is built into the Strands approach:

- **Guardrails**: Input validation and content filtering in YAML
- **IAM Policies**: Least privilege access to AWS resources
- **VPC Support**: Network isolation options
- **WAF Protection**: Web application firewall rules
- **Encryption**: At rest and in transit

## Cost Management

- **Budget Alerts**: Automated cost monitoring
- **Usage Limits**: Rate limiting and throttling
- **Resource Optimization**: Right-sized Lambda functions
- **Caching**: Response caching for frequently asked queries

## Next Steps

1. Deploy the agent configurations to AWS Bedrock
2. Create the Lambda functions and API Gateway endpoints
3. Update environment variables in the existing application
4. Test the integration with both mock and real agents
5. Monitor performance and cost metrics
6. Update documentation and training materials