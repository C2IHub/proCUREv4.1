#!/usr/bin/env node

/**
 * Agent Cards Validation Script
 * Validates that all agent cards are properly structured and complete
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENT_CARDS_DIR = path.join(__dirname, '../docs/agent-cards');

const REQUIRED_SECTIONS = [
  '## Agent Overview',
  '## Function Definitions', 
  '## Guard Rails Configuration',
  '## Memory Management',
  '## Multi-Agent Orchestration',
  '## Performance Monitoring',
  '## Deployment Configuration',
  '## Development Guidance',
  '## Security Controls'
];

const AGENTS = [
  'ComplianceMonitorAgent.md',
  'RiskPredictorAgent.md', 
  'DocumentIntelligenceAgent.md'
];

function validateAgentCard(agentFile) {
  console.log(`\n🔍 Validating ${agentFile}...`);
  
  const filePath = path.join(AGENT_CARDS_DIR, agentFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Agent card file not found: ${agentFile}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let isValid = true;
  
  // Check required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      console.error(`❌ Missing required section: ${section}`);
      isValid = false;
    } else {
      console.log(`✅ Found section: ${section}`);
    }
  }
  
  // Check for function definitions
  const functionDefCount = (content.match(/```json/g) || []).length;
  if (functionDefCount < 3) {
    console.error(`❌ Insufficient function definitions found (${functionDefCount}), expected at least 3`);
    isValid = false;
  } else {
    console.log(`✅ Found ${functionDefCount} function definitions`);
  }
  
  // Check for AWS configuration
  if (!content.includes('aws_infrastructure')) {
    console.error(`❌ Missing AWS infrastructure configuration`);
    isValid = false;
  } else {
    console.log(`✅ Found AWS infrastructure configuration`);
  }
  
  // Check for CloudWatch metrics
  if (!content.includes('cloudwatch_metrics')) {
    console.error(`❌ Missing CloudWatch metrics configuration`);
    isValid = false;
  } else {
    console.log(`✅ Found CloudWatch metrics configuration`);
  }
  
  // Check for security controls
  if (!content.includes('security_controls')) {
    console.error(`❌ Missing security controls configuration`);
    isValid = false;
  } else {
    console.log(`✅ Found security controls configuration`);
  }
  
  // Check word count (should be comprehensive)
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 2000) {
    console.warn(`⚠️  Agent card seems short (${wordCount} words), expected comprehensive documentation`);
  } else {
    console.log(`✅ Comprehensive documentation (${wordCount} words)`);
  }
  
  return isValid;
}

function validateOrchestrationGuide() {
  console.log(`\n🔍 Validating MultiAgentOrchestration.md...`);
  
  const filePath = path.join(AGENT_CARDS_DIR, 'MultiAgentOrchestration.md');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Orchestration guide not found`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let isValid = true;
  
  const requiredOrchestrationSections = [
    '## Orchestration Patterns',
    '## Agent Communication Protocols', 
    '## Deployment Architecture',
    '## Monitoring and Observability',
    '## Security and Governance'
  ];
  
  for (const section of requiredOrchestrationSections) {
    if (!content.includes(section)) {
      console.error(`❌ Missing orchestration section: ${section}`);
      isValid = false;
    } else {
      console.log(`✅ Found section: ${section}`);
    }
  }
  
  return isValid;
}

function validateREADME() {
  console.log(`\n🔍 Validating README.md...`);
  
  const filePath = path.join(AGENT_CARDS_DIR, 'README.md');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ README.md not found`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check that all agent cards are referenced
  for (const agent of AGENTS) {
    const agentName = agent.replace('.md', '');
    if (!content.includes(agentName)) {
      console.error(`❌ README missing reference to ${agentName}`);
      return false;
    }
  }
  
  console.log(`✅ README.md properly references all agents`);
  return true;
}

function main() {
  console.log('🚀 Starting Agent Cards Validation');
  console.log('=====================================');
  
  let allValid = true;
  
  // Validate each agent card
  for (const agent of AGENTS) {
    if (!validateAgentCard(agent)) {
      allValid = false;
    }
  }
  
  // Validate orchestration guide
  if (!validateOrchestrationGuide()) {
    allValid = false;
  }
  
  // Validate README
  if (!validateREADME()) {
    allValid = false;
  }
  
  console.log('\n=====================================');
  if (allValid) {
    console.log('🎉 All agent cards are valid and complete!');
    console.log('📋 Agent cards are ready for deployment and development use.');
    process.exit(0);
  } else {
    console.log('❌ Validation failed. Please fix the issues above.');
    process.exit(1);
  }
}

main();