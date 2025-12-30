import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { ParsedIntent } from '@app/shared/type';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found. Using mock responses.');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemma-3-4b-it',
    });
    this.logger.log(`Initialized Gemini model: gemma-3-4b-it`);
  }

  async generateResponse(
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.model) {
      return 'AI service is not configured. Please set GEMINI_API_KEY in environment variables.';
    }

    try {
      const fullPrompt = context
        ? `${prompt}\n\nContext: ${JSON.stringify(context, null, 2)}`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error generating response: ${err.message}`);
      throw error;
    }
  }

  async parseUserIntent(userMessage: string): Promise<ParsedIntent> {
    if (!this.model) {
      return this.fallbackIntentParsing(userMessage);
    }

    try {
      const prompt = `
Analyze the following Vietnamese user message and extract trip search information. Return ONLY a JSON object.

User message: "${userMessage}"

Extract these fields:
1. intent: Determine if user wants to "search_trip", "booking", "faq", or just "general" chat
2. origin: City/location user is departing FROM (e.g., "Hà Nội", "Sài Gòn", "HCM", "Ho Chi Minh")
3. destination: City/location user is going TO (e.g., "Đà Nẵng", "Vũng Tàu", "Kien Giang")  
4. date: Travel date if mentioned (format: YYYY-MM-DD). Today is ${new Date().toISOString().split('T')[0]}

Common patterns:
- "từ X đi Y" → origin: X, destination: Y
- "đi từ X đến Y" → origin: X, destination: Y  
- "tìm xe X Y" → origin: X, destination: Y
- "ngày mai" → tomorrow's date
- "hôm nay" → today's date

Return JSON format:
{
  "intent": "search_trip",
  "entities": {
    "origin": "city name or null",
    "destination": "city name or null",
    "date": "YYYY-MM-DD or null"
  }
}

IMPORTANT: Return ONLY the JSON object, no other text.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        return JSON.parse(jsonMatch[0]) as ParsedIntent;
      }

      return this.fallbackIntentParsing(userMessage);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error parsing intent: ${err.message}`);
      return this.fallbackIntentParsing(userMessage);
    }
  }

  private fallbackIntentParsing(userMessage: string): ParsedIntent {
    const lowerMessage = userMessage.toLowerCase();

    // Simple keyword-based intent detection
    if (
      lowerMessage.includes('tìm') ||
      lowerMessage.includes('search') ||
      lowerMessage.includes('từ') ||
      lowerMessage.includes('đi') ||
      lowerMessage.includes('đến')
    ) {
      return {
        intent: 'search_trip',
        entities: {
          origin: null,
          destination: null,
          date: null,
        },
      };
    }

    if (
      lowerMessage.includes('đặt') ||
      lowerMessage.includes('book') ||
      lowerMessage.includes('vé')
    ) {
      return {
        intent: 'booking',
        entities: {},
      };
    }

    if (
      lowerMessage.includes('hỏi') ||
      lowerMessage.includes('?') ||
      lowerMessage.includes('như thế nào') ||
      lowerMessage.includes('chính sách')
    ) {
      return {
        intent: 'faq',
        entities: {},
      };
    }

    return {
      intent: 'general',
      entities: {},
    };
  }
}
