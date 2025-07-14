#!/bin/bash

# AWS Strands Agent Deployment Script
# This script helps deploy the Strands agents to AWS

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="procure"
ENVIRONMENT="${ENVIRONMENT:-dev}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to AWS
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "Not logged in to AWS. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    log_info "Prerequisites check passed!"
}

# Deploy a single agent
deploy_agent() {
    local agent_name=$1
    local agent_dir="agents/strands/${agent_name}"
    
    log_info "Deploying ${agent_name} agent..."
    
    # Check if agent directory exists
    if [ ! -d "$agent_dir" ]; then
        log_error "Agent directory not found: $agent_dir"
        return 1
    fi
    
    # Build the Lambda function
    log_info "Building Lambda function for ${agent_name}..."
    cd "$agent_dir"
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        npm install --production
    fi
    
    # Create deployment package
    zip -r "${agent_name}-lambda.zip" index.ts package*.json node_modules/ 2>/dev/null || true
    
    # Deploy using AWS CLI (this is a simplified example)
    log_info "Deploying Lambda function..."
    
    # Create or update Lambda function
    FUNCTION_NAME="${STACK_PREFIX}-${agent_name}-agent"
    
    if aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
        log_info "Updating existing function..."
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://${agent_name}-lambda.zip"
    else
        log_info "Creating new function..."
        # This would need proper IAM role and other configurations
        log_warn "Lambda function creation requires additional setup. Please create manually or use CloudFormation."
    fi
    
    # Clean up
    rm -f "${agent_name}-lambda.zip"
    cd - > /dev/null
    
    log_info "${agent_name} agent deployment completed!"
}

# Deploy all agents
deploy_all_agents() {
    log_info "Deploying all Strands agents..."
    
    agents=("compliance-monitor" "risk-predictor" "document-intelligence")
    
    for agent in "${agents[@]}"; do
        deploy_agent "$agent"
    done
    
    log_info "All agents deployed successfully!"
}

# Validate agent configurations
validate_configs() {
    log_info "Validating agent configurations..."
    
    agents=("compliance-monitor" "risk-predictor" "document-intelligence")
    
    for agent in "${agents[@]}"; do
        config_file="agents/strands/${agent}/agent.yaml"
        
        if [ ! -f "$config_file" ]; then
            log_error "Configuration file not found: $config_file"
            continue
        fi
        
        log_info "Validating ${agent} configuration..."
        
        # Basic YAML validation (requires yq or similar tool)
        if command -v yq &> /dev/null; then
            if yq eval . "$config_file" > /dev/null; then
                log_info "${agent} configuration is valid"
            else
                log_error "${agent} configuration has YAML syntax errors"
            fi
        else
            log_warn "yq not found. Skipping YAML validation for ${agent}"
        fi
    done
}

# Create CloudFormation template
create_cloudformation_template() {
    log_info "Creating CloudFormation template..."
    
    cat > cloudformation-template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'proCURE Strands Agents Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
  
  BedrockRegion:
    Type: String
    Default: us-east-1

Resources:
  # IAM Role for Lambda functions
  AgentExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '${AWS::StackName}-agent-execution-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: BedrockAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - bedrock:InvokeAgent
                  - bedrock:Retrieve
                Resource: '*'

  # API Gateway
  AgentsApiGateway:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub '${AWS::StackName}-agents-api'
      Description: 'API Gateway for proCURE Strands Agents'

Outputs:
  ExecutionRoleArn:
    Description: 'ARN of the Lambda execution role'
    Value: !GetAtt AgentExecutionRole.Arn
    Export:
      Name: !Sub '${AWS::StackName}-execution-role-arn'
  
  ApiGatewayId:
    Description: 'ID of the API Gateway'
    Value: !Ref AgentsApiGateway
    Export:
      Name: !Sub '${AWS::StackName}-api-gateway-id'
EOF

    log_info "CloudFormation template created: cloudformation-template.yaml"
}

# Print usage
usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  validate    Validate agent configurations"
    echo "  deploy      Deploy all agents"
    echo "  deploy-cf   Create CloudFormation template"
    echo "  agent NAME  Deploy specific agent (compliance-monitor, risk-predictor, document-intelligence)"
    echo "  help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION     AWS region (default: us-east-1)"
    echo "  ENVIRONMENT    Deployment environment (default: dev)"
}

# Main script logic
main() {
    case "$1" in
        "validate")
            check_prerequisites
            validate_configs
            ;;
        "deploy")
            check_prerequisites
            validate_configs
            deploy_all_agents
            ;;
        "deploy-cf")
            create_cloudformation_template
            ;;
        "agent")
            if [ -z "$2" ]; then
                log_error "Please specify agent name"
                usage
                exit 1
            fi
            check_prerequisites
            deploy_agent "$2"
            ;;
        "help"|"-h"|"--help")
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"