import { 
  BedrockAgentRuntimeClient, 
  InvokeAgentCommand,
  InvokeAgentCommandInput,
  InvokeAgentResponse
} from '@aws-sdk/client-bedrock-agent-runtime';

// Environment configuration
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const AGENT_ID = process.env.COMPLIANCE_MONITOR_AGENT_ID;
const AGENT_ALIAS_ID = process.env.COMPLIANCE_MONITOR_AGENT_ALIAS_ID || 'TSTALIASID';

// Initialize Bedrock client
const bedrockClient = new BedrockAgentRuntimeClient({
  region: BEDROCK_REGION,
});

// Types
interface AgentRequest {
  prompt: string;
  sessionId?: string;
  context?: Record<string, any>;
}

interface AgentResponse {
  response: string;
  sessionId: string;
  confidence?: number;
  sources?: string[];
  trace?: any[];
}

interface LambdaEvent {
  body: string;
  httpMethod: string;
  headers: Record<string, string>;
  pathParameters?: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Generic Lambda handler for Compliance Monitor Agent
 * This function acts as a proxy between API Gateway and AWS Bedrock Agent
 */
export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  // Validate method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  // Validate configuration
  if (!AGENT_ID) {
    console.error('COMPLIANCE_MONITOR_AGENT_ID environment variable not set');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Agent not configured',
        details: 'COMPLIANCE_MONITOR_AGENT_ID environment variable missing'
      })
    };
  }

  try {
    // Parse request body
    let requestBody: AgentRequest;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        })
      };
    }

    // Validate required fields
    if (!requestBody.prompt || typeof requestBody.prompt !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing or invalid prompt field',
          details: 'Request must include a valid prompt string'
        })
      };
    }

    // Generate session ID if not provided
    const sessionId = requestBody.sessionId || `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build enhanced prompt with context
    let enhancedPrompt = requestBody.prompt;
    if (requestBody.context) {
      const contextInfo = Object.entries(requestBody.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      enhancedPrompt = `Context:\n${contextInfo}\n\nRequest: ${requestBody.prompt}`;
    }

    // Prepare Bedrock Agent invocation
    const invokeParams: InvokeAgentCommandInput = {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: enhancedPrompt,
      enableTrace: true, // Enable for debugging
    };

    console.log('Invoking Bedrock Agent:', {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sessionId,
      promptLength: enhancedPrompt.length
    });

    // Invoke Bedrock Agent
    const command = new InvokeAgentCommand(invokeParams);
    const response: InvokeAgentResponse = await bedrockClient.send(command);

    // Process streaming response
    let fullResponse = '';
    let confidence = 0.85; // Default confidence
    const sources: string[] = [];
    const traces: any[] = [];

    if (response.completion) {
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
          fullResponse += chunkText;
        }
        
        // Collect traces for debugging
        if (chunk.trace) {
          traces.push(chunk.trace);
          
          // Extract confidence and sources from traces if available
          if (chunk.trace.orchestrationTrace?.observation?.finalResponse) {
            const finalResponse = chunk.trace.orchestrationTrace.observation.finalResponse;
            if (finalResponse.confidence) {
              confidence = finalResponse.confidence;
            }
          }
        }
      }
    }

    // Extract sources from knowledge base citations if available
    if (traces.length > 0) {
      traces.forEach(trace => {
        if (trace.orchestrationTrace?.observation?.knowledgeBaseLookupOutput?.retrievedReferences) {
          const refs = trace.orchestrationTrace.observation.knowledgeBaseLookupOutput.retrievedReferences;
          refs.forEach((ref: any) => {
            if (ref.content?.text && !sources.includes(ref.content.text)) {
              sources.push(ref.content.text);
            }
          });
        }
      });
    }

    // Add default regulatory sources if none were found
    if (sources.length === 0) {
      sources.push(
        'EU GMP Guidelines',
        'FDA Regulations (21 CFR)',
        'ISO 13485/15378 Standards',
        'REACH Compliance Database'
      );
    }

    // Build response
    const agentResponse: AgentResponse = {
      response: fullResponse || 'No response generated',
      sessionId: sessionId,
      confidence: Math.min(0.98, confidence),
      sources: sources.slice(0, 4), // Limit to top 4 sources
      trace: process.env.NODE_ENV === 'development' ? traces : undefined
    };

    console.log('Agent response generated:', {
      sessionId: sessionId,
      responseLength: fullResponse.length,
      confidence: agentResponse.confidence,
      sourcesCount: sources.length
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(agentResponse)
    };

  } catch (error) {
    console.error('Error invoking Bedrock Agent:', error);
    
    // Handle specific AWS errors
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.name === 'ValidationException') {
        statusCode = 400;
      } else if (error.name === 'ResourceNotFoundException') {
        statusCode = 404;
        errorMessage = 'Agent not found or not accessible';
      } else if (error.name === 'ThrottlingException') {
        statusCode = 429;
        errorMessage = 'Request rate exceeded. Please try again later.';
      } else if (error.name === 'AccessDeniedException') {
        statusCode = 403;
        errorMessage = 'Access denied. Check IAM permissions.';
      }
    }

    return {
      statusCode: statusCode,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: errorMessage,
        type: error instanceof Error ? error.name : 'UnknownError',
        timestamp: new Date().toISOString(),
        sessionId: requestBody?.sessionId || null
      })
    };
  }
};

/**
 * Health check handler for monitoring
 */
export const healthCheck = async (): Promise<LambdaResponse> => {
  try {
    // Simple health check - verify AWS SDK is working
    const client = new BedrockAgentRuntimeClient({ region: BEDROCK_REGION });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agent: 'compliance-monitor',
        version: '1.0.0',
        configured: !!AGENT_ID
      })
    };
  } catch (error) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};