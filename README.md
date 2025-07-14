# proCURE1 - Pharmaceutical Procurement & Compliance Platform

A modern React application for pharmaceutical supplier compliance management with AI-driven decision making powered by AWS Bedrock agents.

## Features

- **Multi-Supplier Support**: Dynamic routing and context for managing multiple suppliers
- **AI-Driven Compliance**: Integration with AWS Bedrock agents for compliance analysis, risk assessment, and document validation
- **Real-time Data**: React Query integration for efficient data fetching and caching
- **Comprehensive Analytics**: Supplier scoring, risk mitigation, and audit trails
- **Modern UI**: Built with React, TypeScript, and TailwindCSS

## Prerequisites

- Node.js 18+ and npm
- AWS Account with Bedrock access (for AI features)
- Modern web browser

## Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd proCURE1
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Build for production:**
```bash
npm run build
```

## AWS Bedrock Configuration

### Quick Setup (Development)

1. **Copy environment configuration:**
```bash
cp .env.example .env
```

2. **Configure AWS credentials:**
```bash
# Option A: Use AWS CLI
aws configure

# Option B: Set environment variables in .env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

3. **Enable Bedrock integration:**
```bash
# In .env file
BEDROCK_ENABLED=true
BEDROCK_FALLBACK_TO_MOCK=true  # Fallback to mock if AWS fails

# Add your agent IDs after creating them in AWS Console
BEDROCK_COMPLIANCE_AGENT_ID=your_compliance_agent_id
BEDROCK_RISK_AGENT_ID=your_risk_agent_id
BEDROCK_DOCUMENT_AGENT_ID=your_document_agent_id
```

### Production Setup

For production deployment with real AWS Bedrock agents, follow the comprehensive setup guide:

📖 **[Complete AWS Setup Guide](./docs/AWS_BEDROCK_SETUP.md)** - Detailed instructions for AWS Solution Architects

🚀 **[Deployment Configuration](./docs/DEPLOYMENT_CONFIG.md)** - Production deployment options

The production setup includes:
- **AWS Bedrock Agent Creation**: Step-by-step agent configuration
- **IAM Roles and Policies**: Secure access configuration  
- **Cost Optimization**: Budget alerts and optimization strategies
- **Monitoring**: CloudWatch dashboards and alerting
- **Security**: WAF, encryption, and compliance considerations
- **Deployment Options**: ECS, Lambda, Docker configurations

### Agent Configuration

The platform uses three specialized AWS Bedrock agents:

1. **EU GMP Compliance Monitor** (`compliance-monitor`)
   - Regulatory compliance analysis and certification tracking
   - Supports EU GMP, FDA, ISO standards
   - Real-time compliance scoring and audit scheduling

2. **Predictive Risk Assessor** (`risk-predictor`)
   - Multi-factor risk assessment and prediction
   - Financial, operational, and supply chain analysis
   - Early warning system for supplier issues

3. **Document Intelligence Agent** (`document-intelligence`)
   - Document validation and authenticity verification
   - Automated compliance checking and gap analysis
   - Fraud detection and regulatory verification

### Testing Integration

Run the integration test suite to validate your setup:

```bash
# Run integration tests
npm run test:integration

# Test specific agent
npm run test:bedrock -- --agent compliance
```

### Development vs Production

**Development Mode:**
- Uses mock agents by default for offline development
- Simulates real Bedrock responses with realistic delays
- No AWS credentials required for basic development

**Production Mode:**
- Connects to real AWS Bedrock agents
- Requires proper AWS credentials and agent configuration
- Automatic fallback to mock agents if AWS is unavailable
- Performance monitoring and cost tracking enabled

## Development Mode

In development mode, the application uses mock AI agents that simulate real Bedrock responses. This allows you to develop and test without AWS credentials.

To use real Bedrock agents, set the environment variable:
```bash
export NODE_ENV=production
```

## API Integration

The application is designed to work with a REST API backend. Currently, it uses mock data for demonstration. To integrate with your backend:

1. Update the API endpoints in `src/api/mockApi.ts`
2. Replace mock functions with real HTTP calls
3. Configure authentication and error handling as needed

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── api/           # API service layer and mock data
├── components/    # Reusable UI components
├── context/       # React context providers (Bedrock, Supplier)
├── hooks/         # Custom React hooks and React Query hooks
├── pages/         # Page components and routing
├── types/         # TypeScript type definitions
└── App.tsx        # Main application component
```

## Key Technologies

- **Frontend**: React 18, TypeScript, React Router
- **Styling**: TailwindCSS, Lucide React icons
- **State Management**: React Query for server state
- **AI Integration**: AWS Bedrock SDK
- **Build Tool**: Vite
- **Code Quality**: ESLint, TypeScript

## Contributing

1. Follow the existing code style and TypeScript patterns
2. Add proper type definitions for new features
3. Include loading and error states for async operations
4. Test changes with both mock and real data
5. Update documentation for new features

## License

This project is licensed under the MIT License.
