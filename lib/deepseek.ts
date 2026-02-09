import OpenAI from 'openai';
import { PROSPECT_ANALYSIS_PROMPT, SYSTEM_PROMPT } from './prompts';
import { logCost, logFailure, calculateCost } from './cost-tracker';

// OpenAI configuration
const OPENAI_MODEL = 'gpt-4o-mini';

// DeepSeek configuration (via OpenRouter)
const DEEPSEEK_MODEL = 'deepseek/deepseek-chat';

// Lazy initialization of clients to avoid build-time errors
let _openaiClient: OpenAI | null = null;
let _deepseekClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openaiClient;
}

function getDeepSeekClient(): OpenAI {
  if (!_deepseekClient) {
    _deepseekClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });
  }
  return _deepseekClient;
}

// Get the appropriate client and model based on configuration
function getClientAndModel(): { client: OpenAI; model: string } {
  const useOpenAI = process.env.USE_OPENAI === 'true';
  if (useOpenAI) {
    return { client: getOpenAIClient(), model: OPENAI_MODEL };
  }
  return { client: getDeepSeekClient(), model: DEEPSEEK_MODEL };
}

export interface ProspectAnalysis {
  isOECProspect: boolean;
  isOECProspectConfidence: number;
  oecConverted: boolean;
  oecConvertedConfidence: number;
  isOWWAProspect: boolean;
  isOWWAProspectConfidence: number;
  owwaConverted: boolean;
  owwaConvertedConfidence: number;
  isTravelVisaProspect: boolean;
  isTravelVisaProspectConfidence: number;
  travelVisaCountries: string[];
  travelVisaConverted: boolean;
  travelVisaConvertedConfidence: number;
}

export interface AnalysisResult extends ProspectAnalysis {
  success: boolean;
  cost: number;
  error?: string;
}

export async function analyzeConversation(conversationId: string, messages: string): Promise<AnalysisResult> {
  const useOpenAI = process.env.USE_OPENAI === 'true';
  const provider = useOpenAI ? 'OpenAI' : 'DeepSeek';
  
  try {
    const { client, model } = getClientAndModel();
    
    // Truncate very long conversations to avoid token limits
    const truncatedMessages = messages.length > 8000 
      ? messages.substring(0, 8000) + '\n...[truncated]'
      : messages;

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: PROSPECT_ANALYSIS_PROMPT + truncatedMessages }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    // Calculate cost
    const usage = response.usage;
    let cost = 0;
    if (usage) {
      const inputTokens = usage.prompt_tokens || 0;
      const outputTokens = usage.completion_tokens || 0;
      cost = calculateCost(model, inputTokens, outputTokens, false);
      
      logCost({
        model: model,
        type: 'realtime',
        tokens: { input: inputTokens, output: outputTokens },
        cost,
        conversationId,
      });
    }

    const content = response.choices[0]?.message?.content || '{}';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      cost,
      isOECProspect: Boolean(parsed.isOECProspect),
      isOECProspectConfidence: Number(parsed.isOECProspectConfidence) || 0,
      oecConverted: Boolean(parsed.oecConverted),
      oecConvertedConfidence: Number(parsed.oecConvertedConfidence) || 0,
      isOWWAProspect: Boolean(parsed.isOWWAProspect),
      isOWWAProspectConfidence: Number(parsed.isOWWAProspectConfidence) || 0,
      owwaConverted: Boolean(parsed.owwaConverted),
      owwaConvertedConfidence: Number(parsed.owwaConvertedConfidence) || 0,
      isTravelVisaProspect: Boolean(parsed.isTravelVisaProspect),
      isTravelVisaProspectConfidence: Number(parsed.isTravelVisaProspectConfidence) || 0,
      travelVisaCountries: Array.isArray(parsed.travelVisaCountries) ? parsed.travelVisaCountries : [],
      travelVisaConverted: Boolean(parsed.travelVisaConverted),
      travelVisaConvertedConfidence: Number(parsed.travelVisaConvertedConfidence) || 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${provider}] Error analyzing ${conversationId}:`, errorMessage);
    
    const currentModel = process.env.USE_OPENAI === 'true' ? OPENAI_MODEL : DEEPSEEK_MODEL;
    logFailure({
      model: currentModel,
      type: 'realtime',
      conversationId,
      error: errorMessage,
    });
    
    return {
      success: false,
      cost: 0,
      error: errorMessage,
      isOECProspect: false,
      isOECProspectConfidence: 0,
      oecConverted: false,
      oecConvertedConfidence: 0,
      isOWWAProspect: false,
      isOWWAProspectConfidence: 0,
      owwaConverted: false,
      owwaConvertedConfidence: 0,
      isTravelVisaProspect: false,
      isTravelVisaProspectConfidence: 0,
      travelVisaCountries: [],
      travelVisaConverted: false,
      travelVisaConvertedConfidence: 0,
    };
  }
}

// Analyze multiple conversations in parallel
export async function analyzeConversationsBatch(
  conversations: Array<{ id: string; messages: string }>
): Promise<Array<{ id: string; result: AnalysisResult }>> {
  const results = await Promise.allSettled(
    conversations.map(async (conv) => ({
      id: conv.id,
      result: await analyzeConversation(conv.id, conv.messages),
    }))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      id: conversations[index].id,
      result: {
        success: false,
        cost: 0,
        error: result.reason?.message || 'Unknown error',
        isOECProspect: false,
        isOECProspectConfidence: 0,
        oecConverted: false,
        oecConvertedConfidence: 0,
        isOWWAProspect: false,
        isOWWAProspectConfidence: 0,
        owwaConverted: false,
        owwaConvertedConfidence: 0,
        isTravelVisaProspect: false,
        isTravelVisaProspectConfidence: 0,
        travelVisaCountries: [],
        travelVisaConverted: false,
        travelVisaConvertedConfidence: 0,
      },
    };
  });
}
