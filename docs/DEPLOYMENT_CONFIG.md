# proCURE Platform Deployment Configuration

## Docker Configuration

### Dockerfile.production
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install serve for production
RUN npm install -g serve

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S proCURE -u 1001

# Change ownership
RUN chown -R proCURE:nodejs /app
USER proCURE

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start application
CMD ["serve", "-s", "dist", "-l", "3000"]
```

## AWS ECS Configuration

### task-definition.json
```json
{
  "family": "proCURE-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/proCURE-TaskRole",
  "containerDefinitions": [
    {
      "name": "proCURE-app",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/proCURE:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/proCURE-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "BEDROCK_ENABLED",
          "value": "true"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        }
      ],
      "secrets": [
        {
          "name": "BEDROCK_COMPLIANCE_AGENT_ID",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT:parameter/proCURE/bedrock/compliance-agent-id"
        },
        {
          "name": "BEDROCK_RISK_AGENT_ID",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT:parameter/proCURE/bedrock/risk-agent-id"
        },
        {
          "name": "BEDROCK_DOCUMENT_AGENT_ID",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT:parameter/proCURE/bedrock/document-agent-id"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/ || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## AWS Lambda Configuration (Alternative)

### serverless.yml
```yaml
service: proCURE-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  memorySize: 1024
  timeout: 30
  
  environment:
    NODE_ENV: production
    BEDROCK_ENABLED: true
    AWS_REGION: ${self:provider.region}
    STAGE: ${self:provider.stage}
  
  iamRoleStatements:
    - Effect: Allow
      Action:
        - bedrock:InvokeAgent
        - bedrock:GetAgent
        - bedrock:ListAgents
      Resource:
        - "arn:aws:bedrock:*:*:agent/*"
        - "arn:aws:bedrock:*:*:agent-alias/*"
    - Effect: Allow
      Action:
        - ssm:GetParameter
        - ssm:GetParameters
      Resource:
        - "arn:aws:ssm:${self:provider.region}:*:parameter/proCURE/*"

functions:
  agentInvoke:
    handler: api/agent.invoke
    events:
      - http:
          path: api/agents/{agentId}/invoke
          method: post
          cors: true
    environment:
      BEDROCK_COMPLIANCE_AGENT_ID: ${ssm:/proCURE/bedrock/compliance-agent-id}
      BEDROCK_RISK_AGENT_ID: ${ssm:/proCURE/bedrock/risk-agent-id}
      BEDROCK_DOCUMENT_AGENT_ID: ${ssm:/proCURE/bedrock/document-agent-id}

plugins:
  - serverless-offline
  - serverless-webpack

custom:
  webpack:
    webpackConfig: ./webpack.config.js
    includeModules: true
```

## Terraform Infrastructure as Code

### main.tf
```hcl
terraform {
  required_version = ">= 1.0"
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
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

# VPC Configuration
resource "aws_vpc" "proCURE_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "proCURE-vpc-${var.environment}"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public_subnets" {
  count             = 2
  vpc_id            = aws_vpc.proCURE_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "proCURE-public-subnet-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "proCURE_igw" {
  vpc_id = aws_vpc.proCURE_vpc.id

  tags = {
    Name        = "proCURE-igw-${var.environment}"
    Environment = var.environment
  }
}

# Route Table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.proCURE_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.proCURE_igw.id
  }

  tags = {
    Name        = "proCURE-public-rt-${var.environment}"
    Environment = var.environment
  }
}

# Route Table Association
resource "aws_route_table_association" "public_rta" {
  count          = length(aws_subnet.public_subnets)
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group for ALB
resource "aws_security_group" "alb_sg" {
  name_prefix = "proCURE-alb-sg"
  vpc_id      = aws_vpc.proCURE_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "proCURE-alb-sg-${var.environment}"
    Environment = var.environment
  }
}

# Security Group for ECS
resource "aws_security_group" "ecs_sg" {
  name_prefix = "proCURE-ecs-sg"
  vpc_id      = aws_vpc.proCURE_vpc.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "proCURE-ecs-sg-${var.environment}"
    Environment = var.environment
  }
}

# IAM Role for ECS Task
resource "aws_iam_role" "ecs_task_role" {
  name = "proCURE-TaskRole-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Bedrock Access
resource "aws_iam_role_policy" "bedrock_policy" {
  name = "proCURE-BedrockPolicy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent",
          "bedrock:GetAgent",
          "bedrock:ListAgents"
        ]
        Resource = [
          "arn:aws:bedrock:*:*:agent/*",
          "arn:aws:bedrock:*:*:agent-alias/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/proCURE/*"
        ]
      }
    ]
  })
}

# ECS Cluster
resource "aws_ecs_cluster" "proCURE_cluster" {
  name = "proCURE-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "proCURE-cluster-${var.environment}"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "proCURE_alb" {
  name               = "proCURE-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public_subnets[*].id

  enable_deletion_protection = false

  tags = {
    Name        = "proCURE-alb-${var.environment}"
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "proCURE_tg" {
  name        = "proCURE-tg-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.proCURE_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name        = "proCURE-tg-${var.environment}"
    Environment = var.environment
  }
}

# ALB Listener
resource "aws_lb_listener" "proCURE_listener" {
  load_balancer_arn = aws_lb.proCURE_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.proCURE_tg.arn
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "proCURE_logs" {
  name              = "/ecs/proCURE-app-${var.environment}"
  retention_in_days = 14

  tags = {
    Name        = "proCURE-logs-${var.environment}"
    Environment = var.environment
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.proCURE_alb.dns_name
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.proCURE_vpc.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.proCURE_cluster.name
}
```

## Environment-Specific Configurations

### staging.tfvars
```hcl
aws_region  = "us-east-1"
environment = "staging"
```

### production.tfvars
```hcl
aws_region  = "us-east-1"
environment = "production"
```

## CI/CD Pipeline Configuration

### .github/workflows/deploy.yml
```yaml
name: Deploy proCURE to AWS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: proCURE
  ECS_SERVICE: proCURE-service
  ECS_CLUSTER: proCURE-cluster-prod
  ECS_TASK_DEFINITION: task-definition.json

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push image to Amazon ECR
      id: build-image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -f Dockerfile.production -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
        echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

    - name: Fill in the new image ID in the Amazon ECS task definition
      id: task-def
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: ${{ env.ECS_TASK_DEFINITION }}
        container-name: proCURE-app
        image: ${{ steps.build-image.outputs.image }}

    - name: Deploy Amazon ECS task definition
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.task-def.outputs.task-definition }}
        service: ${{ env.ECS_SERVICE }}
        cluster: ${{ env.ECS_CLUSTER }}
        wait-for-service-stability: true
```

## Deployment Scripts

### deploy.sh
```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${2:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Deploying proCURE to ${ENVIRONMENT} environment in ${AWS_REGION}"

# Build and push Docker image
echo "📦 Building Docker image..."
ECR_REPOSITORY="proCURE"
IMAGE_TAG=$(git rev-parse --short HEAD)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Build and push image
docker build -f Dockerfile.production -t ${ECR_URI}:${IMAGE_TAG} .
docker push ${ECR_URI}:${IMAGE_TAG}

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster proCURE-cluster-${ENVIRONMENT} \
  --service proCURE-service-${ENVIRONMENT} \
  --force-new-deployment \
  --region ${AWS_REGION}

echo "✅ Deployment completed successfully!"
echo "🌐 Application will be available at the ALB DNS name"
```

## Monitoring and Alerting

### cloudwatch-dashboard.json
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ECS", "CPUUtilization", "ServiceName", "proCURE-service", "ClusterName", "proCURE-cluster" ],
          [ ".", "MemoryUtilization", ".", ".", ".", "." ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Bedrock", "InvokeAgent", "AgentId", "COMPLIANCE_AGENT_ID" ],
          [ "...", "RISK_AGENT_ID" ],
          [ "...", "DOCUMENT_AGENT_ID" ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Bedrock Agent Invocations"
      }
    }
  ]
}
```

## Cost Optimization

### Budget Configuration
```json
{
  "BudgetName": "proCURE-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "500",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "Service": [
      "Amazon Bedrock",
      "Amazon Elastic Container Service",
      "Amazon CloudWatch"
    ]
  },
  "NotificationsWithSubscribers": [
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "admin@proCURE.com"
        }
      ]
    }
  ]
}
```

## Security Configuration

### WAF Rules
```json
{
  "Name": "proCURE-WebACL",
  "Scope": "REGIONAL",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "OverrideAction": {
        "None": {}
      },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSetMetric"
      }
    }
  ]
}
```

This comprehensive deployment configuration provides multiple deployment options:

1. **Docker**: Production-ready containerization
2. **AWS ECS**: Scalable container orchestration
3. **AWS Lambda**: Serverless alternative
4. **Terraform**: Infrastructure as Code
5. **CI/CD**: Automated deployment pipeline
6. **Monitoring**: CloudWatch dashboards and alerts
7. **Security**: WAF and security groups
8. **Cost Management**: Budgets and optimization

Choose the deployment method that best fits your organization's requirements and infrastructure preferences.