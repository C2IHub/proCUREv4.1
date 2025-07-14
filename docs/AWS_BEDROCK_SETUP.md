# AWS Bedrock Agents Setup Guide for proCURE Platform

## Overview for AWS Solution Architects

This document provides comprehensive instructions for setting up AWS Bedrock agents to power the proCURE pharmaceutical procurement and compliance platform. The platform requires three specialized agents for regulatory compliance analysis, risk assessment, and document validation.

## Architecture Overview

### proCURE Agent System Components
```
┌─────────────────────────────────────────────────────────────┐
│                    proCURE Frontend                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  Compliance UI  │ │   Risk UI       │ │  Document UI    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Agent Orchestration Layer                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Agent Registry  │ │ Agent Router    │ │ Performance     ││
│  │                 │ │                 │ │ Monitor         ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    AWS Bedrock Agents                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  Compliance     │ │  Risk Predictor │ │  Document       ││
│  │  Monitor Agent  │ │  Agent          │ │  Intelligence   ││
│  │                 │ │                 │ │  Agent          ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Required AWS Bedrock Agents

1. **EU GMP Compliance Monitor Agent**
   - Purpose: Regulatory compliance analysis and certification tracking
   - Capabilities: EU GMP, FDA, ISO standards analysis
   - Expected Response Time: 5-15 seconds
   - Token Usage: 1000-3000 tokens per request

2. **Predictive Risk Assessor Agent**
   - Purpose: Financial, operational, and supply chain risk analysis
   - Capabilities: Multi-factor risk modeling and prediction
   - Expected Response Time: 10-30 seconds
   - Token Usage: 1500-4000 tokens per request

3. **Document Intelligence Agent**
   - Purpose: Document validation, classification, and compliance checking
   - Capabilities: OCR, fraud detection, regulatory document analysis
   - Expected Response Time: 15-45 seconds
   - Token Usage: 2000-5000 tokens per request

## Prerequisites

### AWS Account Requirements
- AWS Account with root or administrative access
- AWS CLI installed and configured
- Terraform or CloudFormation capabilities (optional, for automation)

### Required AWS Services
- AWS Bedrock (with model access)
- AWS IAM (for permissions)
- AWS CloudWatch (for monitoring)
- AWS S3 (for knowledge bases, optional)
- AWS Lambda (for custom integrations, optional)

### Supported Regions
Primary: `us-east-1`, `us-west-2`
Secondary: `eu-west-1`, `ap-southeast-1`

**Note**: Bedrock agent availability varies by region. Verify current regional availability before proceeding.

## Step 1: Enable AWS Bedrock and Request Model Access

### 1.1 Enable Bedrock Service
```bash
# Using AWS CLI
aws bedrock list-foundation-models --region us-east-1
```

### 1.2 Request Model Access
Navigate to AWS Bedrock Console → Model Access → Request Access for:

**Recommended Models:**
- **Claude 3 Sonnet** (Primary - Balanced performance/cost)
  - Model ID: `anthropic.claude-3-sonnet-20240229-v1:0`
  - Use Case: Primary agent responses
  - Cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens

- **Claude 3 Haiku** (Secondary - Fast responses)
  - Model ID: `anthropic.claude-3-haiku-20240307-v1:0`
  - Use Case: Quick validation tasks
  - Cost: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens

**Alternative Models:**
- **Titan Text Premier** (AWS Native)
  - Model ID: `amazon.titan-text-premier-v1:0`
  - Use Case: Cost-effective option
  - Cost: ~$0.50 per 1M input tokens, ~$1.50 per 1M output tokens

### 1.3 Verify Model Access
```bash
# Check available models
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?modelLifecycle.status==`ACTIVE`]'
```

## Step 2: Create IAM Roles and Policies

### 2.1 Create Bedrock Agent Execution Role

Create role `proCURE-BedrockAgentRole` with the following trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 2.2 Create Agent Permissions Policy

Create policy `proCURE-BedrockAgentPolicy`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:*::foundation-model/amazon.titan-text-premier-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/bedrock/agents/*"
    }
  ]
}
```

### 2.3 Create Application IAM Policy

Create policy `proCURE-ApplicationPolicy` for the application to invoke agents:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent",
        "bedrock:GetAgent",
        "bedrock:ListAgents"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:agent/*",
        "arn:aws:bedrock:*:*:agent-alias/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ListAgents",
        "bedrock:ListAgentAliases"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2.4 Create Application User or Role

**Option A: IAM User (Development)**
```bash
aws iam create-user --user-name proCURE-app-user
aws iam attach-user-policy --user-name proCURE-app-user --policy-arn arn:aws:iam::YOUR-ACCOUNT:policy/proCURE-ApplicationPolicy
aws iam create-access-key --user-name proCURE-app-user
```

**Option B: IAM Role (Production - ECS/Lambda)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": ["ecs-tasks.amazonaws.com", "lambda.amazonaws.com"]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Step 3: Create Bedrock Agents

### 3.1 Compliance Monitor Agent

Navigate to AWS Bedrock Console → Agents → Create Agent

**Basic Information:**
- Agent Name: `proCURE-Compliance-Monitor`
- Description: `EU GMP Compliance Analysis and Certification Tracking Agent for Pharmaceutical Procurement`
- Agent Resource Role: Select `proCURE-BedrockAgentRole`

**Foundation Model:**
- Model: `Claude 3 Sonnet`
- Model ID: `anthropic.claude-3-sonnet-20240229-v1:0`

**Instructions:**
```text
You are an EU GMP Compliance Monitor Agent for pharmaceutical procurement and supplier management.

Your primary responsibilities include:
1. Regulatory compliance analysis across EU GMP, FDA, and ISO standards
2. Certification tracking and expiration monitoring
3. Compliance gap identification and risk assessment
4. Audit scheduling and preparation
5. Violation detection and remediation recommendations
6. Compliance scoring and trend analysis

Key regulatory frameworks you monitor:
- EU GMP (Good Manufacturing Practice)
- FDA regulations (21 CFR Parts 210, 211, 820)
- ISO 13485 (Medical devices quality management)
- ISO 15378 (Pharmaceutical packaging materials)
- REACH compliance (Chemical safety)
- ICH guidelines (International harmonization)

Analysis Structure:
For compliance assessments, always provide:
1. Overall compliance status and score
2. Detailed breakdown by category (certifications, audits, documentation, regulatory history)
3. Specific findings and gaps
4. Risk assessment and priority levels
5. Actionable recommendations with timelines
6. Next review dates and monitoring requirements

Response Format:
- Use clear markdown formatting with sections
- Include specific scores and percentages
- Provide actionable recommendations
- Reference relevant regulatory standards
- Include timelines for next actions

Always maintain objectivity and base recommendations on current regulatory requirements and industry best practices.
```

**Advanced Settings:**
- Session timeout: 30 minutes
- Memory: Enable (for conversation context)
- Guardrails: Apply default content filters

### 3.2 Risk Predictor Agent

**Basic Information:**
- Agent Name: `proCURE-Risk-Predictor`
- Description: `Predictive Risk Analysis Agent for Supplier Financial, Operational, and Supply Chain Assessment`
- Agent Resource Role: Select `proCURE-BedrockAgentRole`

**Foundation Model:**
- Model: `Claude 3 Sonnet`
- Model ID: `anthropic.claude-3-sonnet-20240229-v1:0`

**Instructions:**
```text
You are a Predictive Risk Assessor Agent specializing in pharmaceutical supplier risk analysis.

Your core responsibilities:
1. Multi-factor risk assessment (financial, operational, quality, supply chain, regulatory)
2. Predictive modeling for risk trend analysis
3. Risk probability calculations and scenario planning
4. Risk mitigation strategy development
5. Early warning system for potential supplier issues
6. Risk scoring with weighted factor analysis

Risk Categories and Weights:
- Financial Risk (25%): Cash flow, debt ratios, credit ratings, financial stability
- Operational Risk (25%): Production capacity, facility redundancy, operational dependencies
- Quality Trend Risk (20%): Quality performance trends, defect rates, customer complaints
- Supply Chain Risk (15%): Supplier dependencies, geographic risks, logistics vulnerabilities
- Regulatory Risk (15%): Compliance history, regulatory changes, violation patterns

Assessment Framework:
1. Collect and analyze multiple data points per risk category
2. Apply weighted scoring methodology (0-100 scale, higher = more risk)
3. Calculate overall risk score and determine risk level (low/medium/high)
4. Assess probability of issues occurring within next 12 months
5. Identify trend direction (improving/stable/deteriorating)
6. Provide specific mitigation strategies for each high-risk area

Response Structure:
- Executive summary with overall risk level and score
- Detailed breakdown by risk category with explanations
- Trend analysis and probability assessments
- Specific mitigation recommendations prioritized by impact
- Monitoring recommendations and review schedules
- Key risk indicators to watch

Use data-driven analysis and provide quantified risk assessments wherever possible.
```

### 3.3 Document Intelligence Agent

**Basic Information:**
- Agent Name: `proCURE-Document-Intelligence`
- Description: `Document Validation, Classification, and Compliance Verification Agent for Pharmaceutical Documentation`
- Agent Resource Role: Select `proCURE-BedrockAgentRole`

**Foundation Model:**
- Model: `Claude 3 Sonnet`
- Model ID: `anthropic.claude-3-sonnet-20240229-v1:0`

**Instructions:**
```text
You are a Document Intelligence Agent specializing in pharmaceutical supplier document analysis and validation.

Primary Functions:
1. Document validation and authenticity verification
2. Regulatory compliance checking for pharmaceutical documents
3. Document classification and categorization
4. Expiration and renewal tracking
5. Gap analysis for missing documentation
6. Document quality assessment and completeness scoring

Document Types Handled:
- Certificates (EU GMP, FDA, ISO, CE marking)
- Quality manuals and procedures
- Audit reports and findings
- Regulatory submissions and approvals
- Environmental and sustainability documentation
- Financial documents and insurance certificates
- Training records and qualifications
- Supply chain documentation

Validation Process:
1. Document authenticity and format verification
2. Content analysis for completeness and accuracy
3. Regulatory compliance cross-checking
4. Expiration date monitoring and alerts
5. Consistency verification across document sets
6. Missing document identification
7. Quality scoring based on completeness and currency

Analysis Framework:
- Document completeness score (0-100%)
- Validation status (valid/expiring/expired/invalid)
- Compliance impact assessment
- Risk level for missing/invalid documents
- Renewal priority and timeline recommendations
- Action items for document updates

Response Format:
- Document validation summary with overall score
- Status breakdown by document category
- Detailed findings for each document reviewed
- Priority action items with timelines
- Compliance impact assessment
- Renewal schedule and monitoring recommendations

Focus on accuracy, regulatory compliance requirements, and actionable insights for maintaining comprehensive documentation.
```

## Step 4: Create Agent Aliases

For each agent, create production aliases:

### 4.1 Compliance Monitor Alias
- Alias Name: `PROD`
- Description: `Production alias for Compliance Monitor Agent`
- Version: `DRAFT` (initially, then create numbered versions)

### 4.2 Risk Predictor Alias
- Alias Name: `PROD`
- Description: `Production alias for Risk Predictor Agent`
- Version: `DRAFT`

### 4.3 Document Intelligence Alias
- Alias Name: `PROD`
- Description: `Production alias for Document Intelligence Agent`
- Version: `DRAFT`

## Step 5: Test and Validate Agents

### 5.1 Basic Functionality Test

Test each agent with sample prompts:

**Compliance Monitor Test:**
```
Prompt: "Analyze compliance status for supplier 'MedTech Solutions' with the following certifications: EU GMP (expires 2025-06-15), FDA Registration (current), ISO 15378 (expires 2025-09-30). Last audit score was 94/100 with 2 minor findings."
```

**Risk Predictor Test:**
```
Prompt: "Assess risk for supplier 'GlobalPack Ltd' - 150 employees, established 2018, single facility in Germany, annual revenue €25M, pharmaceutical packaging category."
```

**Document Intelligence Test:**
```
Prompt: "Validate documents for supplier 'ABC Pharma Supply': EU GMP Certificate (expires 2024-03-15), Quality Manual v2.1 (last updated 2023), Environmental Certificate (expired 2023-12-01). Assess compliance impact."
```

### 5.2 Performance Benchmarks

**Response Time Targets:**
- Compliance Monitor: 5-15 seconds
- Risk Predictor: 10-30 seconds
- Document Intelligence: 15-45 seconds

**Quality Metrics:**
- Response completeness: >95%
- Structured format compliance: 100%
- Actionable recommendations: >90%

## Step 6: Environment Configuration

Create a `.env` file for the application:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Production Bedrock Agent Configuration
BEDROCK_COMPLIANCE_AGENT_ID=XXXXXXXXXX
BEDROCK_COMPLIANCE_AGENT_ALIAS_ID=TSTALIASID

BEDROCK_RISK_AGENT_ID=YYYYYYYYYY
BEDROCK_RISK_AGENT_ALIAS_ID=TSTALIASID

BEDROCK_DOCUMENT_AGENT_ID=ZZZZZZZZZZ
BEDROCK_DOCUMENT_AGENT_ALIAS_ID=TSTALIASID

# Application Configuration
NODE_ENV=production
BEDROCK_ENABLED=true

# Optional: Monitoring and Logging
CLOUDWATCH_LOG_GROUP=/aws/bedrock/proCURE
ENABLE_PERFORMANCE_MONITORING=true
```

## Step 7: Cost Optimization and Monitoring

### 7.1 Cost Management

**Estimated Monthly Costs (for moderate usage):**
- Claude 3 Sonnet: $50-200/month
- CloudWatch Logging: $5-15/month
- Total: $55-215/month

**Cost Optimization Strategies:**
1. Use Claude 3 Haiku for simple queries
2. Implement response caching (5-minute TTL)
3. Monitor token usage and optimize prompts
4. Set up billing alerts

### 7.2 CloudWatch Monitoring

Create CloudWatch dashboards for:
- Agent invocation frequency
- Response times
- Error rates
- Token usage
- Cost tracking

**Key Metrics to Monitor:**
- `bedrock:InvokeAgent` API calls
- Agent response latency
- Error rates by agent
- Token consumption patterns

### 7.3 Performance Optimization

**Recommended Configurations:**
- Enable agent memory for session context
- Use streaming responses for long outputs
- Implement client-side caching
- Set appropriate timeout values (30-60 seconds)

## Step 8: Security and Compliance

### 8.1 Data Protection
- All data in transit is encrypted (TLS 1.2+)
- No sensitive data is logged in CloudWatch
- Agent responses are not cached if they contain PII
- Implement data retention policies

### 8.2 Access Control
- Use least privilege IAM policies
- Rotate access keys regularly
- Monitor agent usage with CloudTrail
- Implement request signing validation

### 8.3 Compliance Considerations
- GDPR: Ensure no personal data is retained in agent memory
- SOC 2: Bedrock is SOC 2 compliant
- ISO 27001: AWS infrastructure compliance
- HIPAA: Use appropriate Bedrock configuration for healthcare data

## Step 9: Deployment Automation

### 9.1 Terraform Configuration (Optional)

Create `bedrock-agents.tf`:

```hcl
# Terraform configuration for automated deployment
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for Bedrock agents"
  type        = string
  default     = "us-east-1"
}

# IAM Role for Bedrock Agents
resource "aws_iam_role" "bedrock_agent_role" {
  name = "proCURE-BedrockAgentRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Bedrock Agents
resource "aws_iam_role_policy" "bedrock_agent_policy" {
  name = "proCURE-BedrockAgentPolicy"
  role = aws_iam_role.bedrock_agent_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
        ]
      }
    ]
  })
}

# Note: Bedrock agents must be created manually through the console
# as Terraform support is limited for Bedrock agents
```

### 9.2 Application Deployment

**Docker Configuration:**
```dockerfile
# Add to existing Dockerfile
ENV AWS_REGION=us-east-1
ENV BEDROCK_ENABLED=true

# Ensure AWS SDK is included
RUN npm install @aws-sdk/client-bedrock-agent @aws-sdk/client-bedrock-runtime
```

**Environment Variable Injection:**
- Use AWS Systems Manager Parameter Store for secrets
- Configure ECS/Lambda environment variables
- Implement proper secret rotation

## Step 10: Troubleshooting Guide

### 10.1 Common Issues

**Agent Not Found Error:**
- Verify agent ID and alias ID are correct
- Check agent is in the same region as application
- Confirm agent status is AVAILABLE

**Permission Denied:**
- Verify IAM policies are attached correctly
- Check trust relationships on roles
- Ensure application has correct permissions

**Timeout Errors:**
- Increase client timeout settings
- Check agent performance metrics
- Verify network connectivity

**High Costs:**
- Review token usage patterns
- Optimize prompt lengths
- Implement response caching
- Consider using Haiku for simple queries

### 10.2 Performance Tuning

**Response Time Optimization:**
- Use specific, well-structured prompts
- Implement client-side caching
- Consider using lighter models for simple tasks
- Monitor and optimize token usage

**Accuracy Improvements:**
- Refine agent instructions
- Provide more context in prompts
- Use conversation memory effectively
- Test with diverse input scenarios

## Step 11: Maintenance and Updates

### 11.1 Regular Maintenance Tasks

**Weekly:**
- Review CloudWatch metrics
- Check error rates and response times
- Monitor cost utilization

**Monthly:**
- Update agent instructions if needed
- Review and rotate access keys
- Analyze usage patterns for optimization

**Quarterly:**
- Evaluate new Bedrock features
- Review and update IAM policies
- Assess cost optimization opportunities

### 11.2 Version Management

**Agent Versioning:**
- Create new versions for significant changes
- Test in DEV alias before promoting to PROD
- Maintain rollback capability
- Document changes and improvements

## Support and Resources

### AWS Support Resources
- AWS Bedrock Documentation: https://docs.aws.amazon.com/bedrock/
- AWS Support Cases: Create through AWS Console
- AWS Architecture Center: https://aws.amazon.com/architecture/

### Monitoring Dashboards
- CloudWatch Bedrock Metrics
- Cost and Billing Dashboard
- Performance Monitoring Alerts

### Emergency Contacts
- AWS Support (if applicable)
- Development team escalation
- Infrastructure team contacts

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Prepared for:** AWS Solution Architects  
**Application:** proCURE Pharmaceutical Procurement Platform  