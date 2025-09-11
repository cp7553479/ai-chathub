import { LobeRuntimeAI } from '../BaseAI';
import { ChatCompletionErrorPayload, ChatMethodOptions, ChatStreamPayload } from '../types';
import { AgentRuntimeErrorType } from '../types/error';

// CrewHub 自定义响应格式
interface CrewHubResponse {
  data?: {
    finish_reason: string;
    model: string;
    response: string;
    tokens_used: number;
  };
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
}

// CrewHub 模型信息
interface CrewHubModel {
  capabilities: string[];
  description: string;
  id: string;
  max_tokens: number;
  name: string;
  status: 'active' | 'inactive';
}

export class LobeCrewHubAI implements LobeRuntimeAI {
  private apiKey: string;
  baseURL: string;
  private id: string;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.crewhub.ai/v1';
    this.id = 'crewhub';
  }

  async chat(payload: ChatStreamPayload, options?: ChatMethodOptions): Promise<Response> {
    try {
      // 1. 转换输入格式
      const crewHubRequest = this.transformInput(payload);

      // 2. 发送请求到 CrewHub API
      const response = await this.sendCrewHubRequest(crewHubRequest, options);

      // 3. 转换输出格式
      return this.transformOutput(response, options);
    } catch (error) {
      throw this.transformError(error);
    }
  }

  async models(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const crewHubModels = await response.json();
      return this.transformModels(crewHubModels);
    } catch (error) {
      console.error('CrewHub models fetch error:', error);
      return [];
    }
  }

  // 输入转换：ChatStreamPayload → CrewHub 格式
  private transformInput(payload: ChatStreamPayload): any {
    return {
      messages: this.convertMessages(payload.messages),
      model: payload.model,
      parameters: {
        frequency_penalty: payload.frequency_penalty,
        max_tokens: payload.max_tokens,
        presence_penalty: payload.presence_penalty,
        temperature: payload.temperature,
        top_p: payload.top_p,
      },
      stream: payload.stream !== false,
    };
  }

  // 发送 CrewHub 请求
  private async sendCrewHubRequest(
    request: any,
    options?: ChatMethodOptions,
  ): Promise<CrewHubResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      body: JSON.stringify(request),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
      },
      method: 'POST',
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { code: 'UNKNOWN', message: 'Unknown error' } }));
      throw errorData;
    }

    return response.json();
  }

  // 输出转换：CrewHub 格式 → LobeChat 标准流式响应
  private transformOutput(crewHubResponse: CrewHubResponse, options?: ChatMethodOptions): Response {
    if (!crewHubResponse.success || !crewHubResponse.data) {
      throw new Error(crewHubResponse.error?.message || 'Invalid response from CrewHub');
    }

    const stream = new ReadableStream({
      start: async (controller) => {
        try {
          const data = crewHubResponse.data!;

          // 模拟流式响应
          const chunks = this.createStreamChunks(data);

          for (const chunk of chunks) {
            // 调用文本回调
            if (options?.callback?.onText && chunk.choices[0]?.delta?.content) {
              await options.callback.onText(chunk.choices[0].delta.content);
            }

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));

            // 模拟流式延迟
            if (chunks.length > 1) {
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 50);
              });
            }
          }

          // 结束标记
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();

          // 调用完成回调
          if (options?.callback?.onFinal) {
            await options.callback.onFinal({
              text: data.response,
              usage: {
                
                inputTextTokens: Math.floor(data.tokens_used * 0.7),
                // 估算
outputTextTokens: Math.floor(data.tokens_used * 0.3),
                totalTokens: data.tokens_used,
              },
            });
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
      },
    });
  }

  // 错误转换
  private transformError(error: any): ChatCompletionErrorPayload {
    const errorCode = error.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = error.error?.message || error.message || 'Unknown error';

    switch (errorCode) {
      case 'INVALID_API_KEY':
      case 'AUTHENTICATION_FAILED': {
        return {
          endpoint: this.baseURL,
          error: errorMessage,
          errorType: AgentRuntimeErrorType.InvalidProviderAPIKey,
          provider: this.id,
        };
      }

      case 'RATE_LIMIT_EXCEEDED': {
        return {
          endpoint: this.baseURL,
          error: errorMessage,
          errorType: AgentRuntimeErrorType.QuotaLimitReached,
          provider: this.id,
        };
      }

      case 'MODEL_NOT_FOUND': {
        return {
          endpoint: this.baseURL,
          error: errorMessage,
          errorType: AgentRuntimeErrorType.ModelNotFound,
          provider: this.id,
        };
      }

      default: {
        return {
          endpoint: this.baseURL,
          error: errorMessage,
          errorType: AgentRuntimeErrorType.ProviderBizError,
          provider: this.id,
        };
      }
    }
  }

  // 消息转换
  private convertMessages(messages: any[]): any[] {
    return messages.map((msg) => ({
      content:
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map((part: any) => {
                if (part.type === 'text') return part.text;
                if (part.type === 'image_url') return `[Image: ${part.image_url.url}]`;
                return '';
              })
              .join(''),
      role: msg.role,
    }));
  }

  // 模型列表转换
  private transformModels(crewHubModels: CrewHubModel[]): any[] {
    return crewHubModels
      .filter((model) => model.status === 'active')
      .map((model) => ({
        contextWindowTokens: model.max_tokens,
        description: model.description,
        displayName: model.name,
        enabled: true,
        functionCall: model.capabilities.includes('function_calling'),
        id: model.id,
        releasedAt: new Date().toISOString().split('T')[0],
        vision: model.capabilities.includes('vision'), // 当前日期
      }));
  }

  // 创建流式 chunks
  private createStreamChunks(data: CrewHubResponse['data']): any[] {
    const text = data?.response || '';
    const chunkSize = Math.max(1, Math.floor(text.length / 10)); // 分成 ~10 个 chunk
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunkText = text.slice(i, i + chunkSize);
      chunks.push({
        choices: [
          {
            delta: { content: chunkText },
            finish_reason: i + chunkSize >= text.length ? data?.finish_reason || 'stop' : null,
            index: 0,
          },
        ],
        created: Math.floor(Date.now() / 1000),
        id: `chatcmpl-${Date.now()}-${i}`,
        model: data?.model || 'emailcrew',
        object: 'chat.completion.chunk',
      });
    }

    return chunks;
  }
}
