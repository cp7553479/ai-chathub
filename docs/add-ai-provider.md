# 添加 AI Provider 开发指南

本文档详细说明如何在 LobeChat 中添加新的 AI Provider（人工智能服务提供商）以及自定义模型。涵盖从配置到运行时实现的完整流程。

## 🎯 目标

通过本指南，你将学会：

- 添加新的 AI Provider 到 LobeChat
- 配置 Provider 的模型列表和参数
- 实现自定义的请求协议处理
- 处理 Provider 特定的错误和响应
- 集成 Provider 到前端界面

## 📋 前置要求

- 熟悉 TypeScript 和 React
- 了解 OpenAI API 兼容格式
- 熟悉 LobeChat 的项目结构
- 了解基本的 AI 模型调用流程

## 🏗️ AI Provider 架构概览

LobeChat 的 AI Provider 系统采用多层架构：

```
前端 UI → 配置层 → 运行时层 → 模型库 → 实际 API 调用
```

### 核心组件

1. **配置层** (`src/config/modelProviders/`)
   - Provider 基本信息和模型列表
   - API 配置和参数设置

2. **模型库** (`packages/model-bank/src/aiModels/`)
   - 详细的模型定义和参数
   - 模型能力声明

3. **运行时层** (`packages/model-runtime/src/`)
   - 实际的 API 调用实现
   - 请求 / 响应处理
   - 错误处理

4. **集成层**
   - Provider 注册和映射
   - 环境配置
   - 前端界面集成

## 🔧 实现步骤

### 重要前提：类型兼容性

**model-runtime 最关键的要求是保持与项目其他 provider 一致的输入和输出类型：**

1. **输入类型统一**：所有 provider 必须接受 `ChatStreamPayload` 类型
2. **输出格式统一**：必须返回标准的 `Response` 对象，包含格式化的流式数据
3. **错误处理统一**：使用标准的 `ChatCompletionErrorPayload` 错误格式
4. **模型列表统一**：返回标准化的 `ChatModelCard[]` 格式

### 第一步：添加 Provider 配置

#### 1.1 创建 Provider 配置文件

在 `src/config/modelProviders/` 目录下创建新的配置文件，例如 `myprovider.ts`：

```typescript
import { ModelProviderCard } from '@/types/llm';

const MyProvider: ModelProviderCard = {
  id: 'myprovider',
  name: 'MyProvider',
  apiKeyUrl: 'https://myprovider.com/api-keys',
  url: 'https://myprovider.com',
  description: 'MyProvider 是一个提供高质量 AI 模型的服务平台',
  enabled: true,
  checkModel: 'gpt-4', // 用于连接测试的模型
  chatModels: [
    {
      id: 'gpt-4',
      displayName: 'GPT-4',
      contextWindowTokens: 8192,
      description: 'GPT-4 模型，适用于复杂任务',
      enabled: true,
      functionCall: true,
      vision: true,
      pricing: {
        units: [
          { name: 'textInput', rate: 0.03, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.06, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
      releasedAt: '2023-03-14',
    },
    // 更多模型...
  ],
  settings: {
    showModelFetcher: true,
    responseAnimation: 'smooth',
  },
};

export default MyProvider;
```

**关键字段说明：**

- `id`: Provider 唯一标识符，必须全局唯一
- `checkModel`: 用于连接测试的模型 ID
- `chatModels`: 支持的模型列表
- `pricing`: 定价信息（可选）
- `settings`: Provider 特定设置

#### 1.2 注册 Provider

在 `src/config/modelProviders/index.ts` 中导入并注册：

```typescript
// 1. 导入你的 Provider
import MyProvider from './myprovider';

// 2. 添加到 DEFAULT_MODEL_PROVIDER_LIST
export const DEFAULT_MODEL_PROVIDER_LIST = [
  // ... 现有 providers
  MyProvider, // 添加你的 provider
];

// 3. 导出 Provider（用于其他地方引用）
export { default as MyProviderCard } from './myprovider';
```

### 第二步：添加模型库定义

#### 2.1 创建模型定义文件

在 `packages/model-bank/src/aiModels/` 创建 `myprovider.ts`：

```typescript
import { AIChatModelCard } from '../types/aiModel';

export const myproviderChatModels: AIChatModelCard[] = [
  {
    abilities: {
      functionCall: true,
      reasoning: true,
      search: true,
      vision: true,
    },
    contextWindowTokens: 128000,
    description: 'GPT-4 模型，适用于复杂的多模态任务',
    displayName: 'GPT-4',
    enabled: true,
    id: 'gpt-4',
    maxOutput: 8192,
    pricing: {
      units: [
        { name: 'textInput', rate: 30, strategy: 'fixed', unit: 'millionTokens' },
        { name: 'textOutput', rate: 60, strategy: 'fixed', unit: 'millionTokens' },
      ],
    },
    releasedAt: '2023-03-14',
    settings: {
      extendParams: ['reasoningEffort'],
    },
    type: 'chat',
  },
  // 更多模型定义...
];

// 如果你有其他类型的模型（embedding, image等）
export const myproviderEmbeddingModels: AIEmbeddingModelCard[] = [
  // embedding 模型定义
];

export const allModels = [...myproviderChatModels, ...myproviderEmbeddingModels];

export default allModels;
```

#### 2.2 注册到模型库索引

在 `packages/model-bank/src/aiModels/index.ts` 中：

```typescript
// 1. 导入模型定义
import { default as myprovider } from './myprovider';

// 2. 添加到 LOBE_DEFAULT_MODEL_LIST
export const LOBE_DEFAULT_MODEL_LIST = buildDefaultModelList({
  // ... 现有 providers
  myprovider, // 添加你的 provider
});

// 3. 导出模型定义
export { default as myprovider } from './myprovider';
```

### 第三步：实现运行时

#### 3.1 创建运行时实现

在 `packages/model-runtime/src/myprovider/index.ts`：

```typescript
import { ChatStreamPayload, ModelProvider } from '../types';
import { createOpenAICompatibleRuntime } from '../utils/openaiCompatibleFactory';

export const LobeMyProviderAI = createOpenAICompatibleRuntime({
  baseURL: 'https://api.myprovider.com/v1',
  provider: ModelProvider.MyProvider, // 需要先在 types 中定义

  // 可选：自定义请求处理
  chatCompletion: {
    handlePayload: (payload: ChatStreamPayload) => {
      // 自定义请求参数处理
      const { model, messages, ...rest } = payload;

      // 例如：添加 Provider 特定的参数
      return {
        ...rest,
        model,
        // Provider 特定参数
        custom_param: 'value',
      };
    },

    // 可选：自定义错误处理
    handleError: (error: any) => {
      // 自定义错误处理逻辑
      if (error.status === 401) {
        return {
          error: error.message,
          errorType: 'InvalidAPIKey',
        };
      }
      return undefined; // 使用默认错误处理
    },
  },

  // 可选：自定义模型列表获取
  models: async ({ client }) => {
    // 自定义模型列表逻辑
    const models = await client.models.list();
    return models.data.map((model) => ({
      id: model.id,
      displayName: model.id,
      // ... 其他属性
    }));
  },
});
```

#### 3.2 定义 Provider 类型

在 `packages/model-runtime/src/types/type.ts` 添加：

```typescript
export enum ModelProvider {
  // ... 现有 providers
  MyProvider = 'myprovider', // 添加你的 provider
}
```

#### 3.3 注册到运行时映射

在 `packages/model-runtime/src/runtimeMap.ts` 中：

```typescript
import { LobeMyProviderAI } from './myprovider';

export const providerRuntimeMap = {
  // ... 现有 providers
  myprovider: LobeMyProviderAI, // 添加映射
};
```

### 第四步：环境配置

#### 4.1 添加环境变量

在 `src/config/llm.ts` 中添加：

```typescript
export const getLLMConfig = () => {
  return createEnv({
    server: {
      // ... 现有配置

      // 添加你的 Provider 配置
      ENABLED_MYPROVIDER: z.boolean(),
      MYPROVIDER_API_KEY: z.string().optional(),
      MYPROVIDER_PROXY_URL: z.string().optional(),
    },
    // ...
  });
};
```

#### 4.2 添加参数映射

在 `src/server/modules/ModelRuntime/index.ts` 中：

```typescript
const getParamsFromPayload = (provider: string, payload: ClientSecretPayload) => {
  switch (provider) {
    // ... 现有 cases

    case ModelProvider.MyProvider: {
      const { MYPROVIDER_API_KEY } = llmConfig;
      const apiKey = apiKeyManager.pick(payload?.apiKey || MYPROVIDER_API_KEY);
      const baseURL = payload?.baseURL || process.env.MYPROVIDER_PROXY_URL;
      return { apiKey, baseURL };
    }

    default: {
      // 默认处理逻辑（如果 Provider 不需要特殊处理）
      // ...
    }
  }
};
```

### 第五步：前端界面集成

#### 5.1 Provider 设置界面自动生成

**重要发现：Provider 设置界面会根据配置文件自动渲染，不需要单独创建复杂的界面！**

系统使用统一的 `ProviderConfig` 组件，根据你的配置文件动态生成界面：

```tsx
// src/app/[variants]/(main)/settings/provider/(detail)/[id]/page.tsx
const Page = async (props: PagePropsWithId) => {
  const params = await props.params;

  const builtinProviderCard = DEFAULT_MODEL_PROVIDER_LIST.find((v) => v.id === params.id);
  // if builtin provider
  if (!!builtinProviderCard) return <ProviderDetail source={'builtin'} {...builtinProviderCard} />;

  return <ClientMode id={params.id} />;
};
```

**你只需要创建最简单的页面文件：**

```tsx
// src/app/[variants]/(main)/settings/provider/(detail)/myprovider/page.tsx
'use client';

import { MyProviderCard } from '@/config/modelProviders';

import ProviderDetail from '../[id]';

// src/app/[variants]/(main)/settings/provider/(detail)/myprovider/page.tsx

const Page = () => {
  return <ProviderDetail {...MyProviderCard} />;
};

export default Page;
```

#### 5.2 模型配置界面自动加载

**模型配置界面会根据模型的配置文件自动渲染：**

1. **模型列表自动获取**：`ProviderDetail` 组件会自动调用 `useFetchAiProviderModels(id)`
2. **模型分类显示**：根据模型定义中的 `type` 字段自动分类（chat、embedding、image、tts、stt）
3. **模型属性渲染**：根据模型的 `abilities` 自动显示功能标签（functionCall、vision、reasoning 等）
4. **定价信息**：根据 `pricing` 配置自动显示价格信息

#### 5.3 自定义配置项（可选）

如果你的 Provider 需要特殊的配置项（如 AWS Bedrock 的多密钥配置），可以自定义：

```tsx
// 参考 Bedrock 的实现
const useMyProviderCard = (): ProviderItem => {
  const { t } = useTranslation('modelProvider');

  return {
    ...MyProviderCard,
    apiKeyItems: [
      {
        children: <FormInput placeholder={t('myprovider.customField.placeholder')} />,
        desc: t('myprovider.customField.desc'),
        label: t('myprovider.customField.title'),
        name: ['config', 'customField'],
      },
      // 更多自定义字段...
    ],
  };
};
```

#### 5.4 添加翻译（可选）

在对应的翻译文件中添加：

```json
{
  "provider": {
    "myprovider": {
      "title": "MyProvider 设置"
    }
  }
}
```

## 🔄 高级自定义

### 自定义运行时兼容层（非 OpenAI 兼容 Provider）

当自定义 AI 大模型接口**不兼容 OpenAI 格式**时，你需要实现一个**自定义的运行时兼容层**。这类似于 `createOpenAICompatibleRuntime` 的功能，但完全自己实现。

#### 核心设计思想

```
自定义 AI Provider API  ←→  你的兼容层  ←→  LobeChat 标准格式
     (任意格式)              (转换器)         (ChatStreamPayload)
```

#### 自定义兼容层模板

```typescript
// packages/model-runtime/src/myprovider/customRuntime.ts
import { LobeRuntimeAI } from '../BaseAI';
import {
  ChatCompletionErrorPayload,
  ChatMethodOptions,
  ChatStreamPayload,
  ModelProvider,
} from '../types';

export class LobeMyProviderCustomRuntime implements LobeRuntimeAI {
  private apiKey: string;
  private baseURL: string;
  private id: string;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.myprovider.com';
    this.id = 'myprovider';
  }

  async chat(payload: ChatStreamPayload, options?: ChatMethodOptions): Promise<Response> {
    try {
      // 1. 转换输入格式：LobeChat 格式 → 自定义 Provider 格式
      const customRequest = this.transformInput(payload);

      // 2. 发送请求到自定义 Provider
      const response = await this.sendCustomRequest(customRequest, options);

      // 3. 转换输出格式：自定义 Provider 格式 → LobeChat 格式
      return this.transformOutput(response, options);
    } catch (error) {
      // 4. 转换错误格式
      throw this.transformError(error);
    }
  }

  // 输入转换：ChatStreamPayload → 自定义格式
  private transformInput(payload: ChatStreamPayload): CustomProviderRequest {
    return {
      // 自定义格式转换逻辑
      model: payload.model,
      prompt: this.convertMessagesToPrompt(payload.messages),
      parameters: {
        temperature: payload.temperature,
        max_tokens: payload.max_tokens,
        // 自定义参数映射...
      },
      // Provider 特定字段
      custom_field: 'value',
      auth_token: this.apiKey,
    };
  }

  // 发送自定义请求
  private async sendCustomRequest(
    request: CustomProviderRequest,
    options?: ChatMethodOptions,
  ): Promise<CustomProviderResponse> {
    const response = await fetch(`${this.baseURL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        // 自定义头部...
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw await this.parseCustomError(response);
    }

    return response.json();
  }

  // 输出转换：自定义格式 → LobeChat 标准流式响应
  private transformOutput(
    customResponse: CustomProviderResponse,
    options?: ChatMethodOptions,
  ): Response {
    // 创建符合 LobeChat 标准的流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 转换自定义响应为 OpenAI 兼容的 chunk 格式
          const chunks = this.convertToOpenAIChunks(customResponse);

          for (const chunk of chunks) {
            // 调用回调函数（如果有）
            if (options?.callback?.onText) {
              await options.callback.onText(chunk.choices[0]?.delta?.content || '');
            }

            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }

          // 发送结束标记
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();

          // 调用完成回调
          if (options?.callback?.onFinal) {
            await options.callback.onFinal({
              text: this.extractFullText(customResponse),
              usage: this.convertUsage(customResponse),
            });
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 错误转换：自定义错误 → LobeChat 标准错误
  private transformError(error: any): ChatCompletionErrorPayload {
    // 自定义错误码映射
    if (error.code === 'QUOTA_EXCEEDED') {
      return {
        error: error.message,
        errorType: AgentRuntimeErrorType.InsufficientQuota,
        provider: this.id,
        endpoint: this.baseURL,
      };
    }

    if (error.code === 'CONTENT_FILTERED') {
      return {
        error: error.message,
        errorType: AgentRuntimeErrorType.ContentPolicyViolation,
        provider: this.id,
        endpoint: this.baseURL,
      };
    }

    // 默认错误处理
    return {
      error: error.message || 'Unknown error',
      errorType: AgentRuntimeErrorType.ProviderBizError,
      provider: this.id,
      endpoint: this.baseURL,
    };
  }

  // 实现 models() 方法
  async models(): Promise<ChatModelCard[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) throw new Error('Failed to fetch models');

      const customModels = await response.json();

      // 转换自定义模型格式 → LobeChat 标准格式
      return customModels.map(
        (model: CustomModel): ChatModelCard => ({
          id: model.id,
          displayName: model.name,
          contextWindowTokens: model.max_context_length,
          description: model.description,
          enabled: model.status === 'active',
          functionCall: model.capabilities.includes('function_calling'),
          vision: model.capabilities.includes('vision'),
          pricing: this.convertPricing(model.pricing),
          releasedAt: model.release_date,
        }),
      );
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return []; // 返回空数组而不是抛出错误
    }
  }

  // 辅助转换方法
  private convertMessagesToPrompt(messages: OpenAIChatMessage[]): string {
    return messages
      .map((msg) => {
        if (typeof msg.content === 'string') {
          return `${msg.role}: ${msg.content}`;
        }
        // 处理多模态内容...
        return `${msg.role}: ${msg.content
          .map((part) => {
            if (part.type === 'text') return part.text;
            if (part.type === 'image_url') return '[Image]';
            return '';
          })
          .join('')}`;
      })
      .join('\n');
  }

  private convertToOpenAIChunks(
    customResponse: CustomProviderResponse,
  ): OpenAIChatCompletionChunk[] {
    // 将自定义响应格式转换为 OpenAI 兼容的 chunk 格式
    // 这是最关键的部分，确保 LobeChat 能正确解析
    return [
      {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: customResponse.model,
        choices: [
          {
            index: 0,
            delta: { content: customResponse.text },
            finish_reason: customResponse.finish_reason,
          },
        ],
        usage: customResponse.usage
          ? {
              prompt_tokens: customResponse.usage.input_tokens,
              completion_tokens: customResponse.usage.output_tokens,
              total_tokens: customResponse.usage.total_tokens,
            }
          : undefined,
      },
    ];
  }
}
```

#### 关键实现要点

1. **输入转换**：将 `ChatStreamPayload` 转换为你自定义 Provider 的格式
2. **输出转换**：将 Provider 的响应转换为 LobeChat 标准的流式格式
3. **错误转换**：统一错误码和错误信息格式
4. **模型列表**：转换模型定义格式
5. **流式处理**：正确处理流式响应和回调函数

#### 使用自定义兼容层

```typescript
// packages/model-runtime/src/myprovider/index.ts
import { LobeMyProviderCustomRuntime } from './customRuntime';

// 创建兼容层实例
export const LobeMyProviderAI = ({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) => {
  return new LobeMyProviderCustomRuntime({ apiKey, baseURL });
};

// 注册到运行时映射
// packages/model-runtime/src/runtimeMap.ts
import { LobeMyProviderAI } from './myprovider';

export const providerRuntimeMap = {
  // ... 其他 providers
  myprovider: LobeMyProviderAI,
};
```

#### 与 createOpenAICompatibleRuntime 的区别

| 特性         | createOpenAICompatibleRuntime | 自定义兼容层         |
| ------------ | ----------------------------- | -------------------- |
| **基础**     | OpenAI 客户端                 | 原生 fetch/API       |
| **开发速度** | 极快（5 行代码）              | 较慢（需要完整实现） |
| **灵活性**   | 中等（受限于 OpenAI 格式）    | 极高（完全自定义）   |
| **维护成本** | 低（自动更新）                | 高（需要手动维护）   |
| **适用场景** | OpenAI 兼容 Provider          | 任意自定义 API 格式  |

#### 最佳实践建议

1. **先尝试 createOpenAICompatibleRuntime**：除非确实不兼容
2. **参考现有非 OpenAI 实现**：如 Anthropic、Bedrock 等
3. **分步实现**：先实现基本聊天，再添加高级功能
4. **充分测试**：确保所有转换逻辑正确
5. **保持更新**：随着 Provider API 变化及时更新兼容层

### 自定义请求协议

如果你的 Provider 不兼容 OpenAI API 格式，需要完全自定义实现：

```typescript
import { LobeRuntimeAI } from '../BaseAI';
import { ChatMethodOptions, ChatStreamPayload } from '../types';

export class LobeMyProviderAI implements LobeRuntimeAI {
  private apiKey: string;
  private baseURL: string;

  constructor({ apiKey, baseURL }: { apiKey: string; baseURL?: string }) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.myprovider.com';
  }

  async chat(payload: ChatStreamPayload, options?: ChatMethodOptions) {
    // 完全自定义的聊天实现
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.transformPayload(payload)),
    });

    // 处理响应流
    return this.handleStreamResponse(response, options);
  }

  private transformPayload(payload: ChatStreamPayload) {
    // 转换 payload 到 Provider 格式
    return {
      // Provider 特定格式
    };
  }

  private async handleStreamResponse(response: Response, options?: ChatMethodOptions) {
    // 处理流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) return;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 处理和转换数据
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream);
  }
}
```

### 自定义模型列表获取

```typescript
models: async ({ client }) => {
  // 自定义模型列表逻辑
  const response = await fetch(`${this.baseURL}/models`, {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
    },
  });

  const data = await response.json();

  return data.models.map(model => ({
    id: model.id,
    displayName: model.name,
    contextWindowTokens: model.context_length,
    abilities: {
      functionCall: model.supports_function_calling,
      vision: model.supports_vision,
    },
    // ... 其他属性
  }));
},
```

### 高级错误处理

```typescript
chatCompletion: {
  handleError: (error: any, options: any) => {
    // Provider 特定的错误码映射
    if (error.code === 'rate_limit_exceeded') {
      return {
        error: error.message,
        errorType: 'RateLimitExceeded',
      };
    }

    if (error.code === 'content_policy_violation') {
      return {
        error: error.message,
        errorType: 'ContentPolicyViolation',
      };
    }

    // 返回 undefined 使用默认错误处理
    return undefined;
  },

  handleStreamBizErrorType: (error: { message: string; name: string }) => {
    // 流式响应中的业务错误处理
    if (error.message.includes('sensitive content')) {
      return 'ContentPolicyViolation';
    }
    return undefined;
  },
},
```

## ⚠️ 常见错误和解决方案

### 1. Provider 未注册错误

**错误：** `Provider 'myprovider' not found in runtime map`

**解决：**

- 确保在 `runtimeMap.ts` 中正确注册
- 检查 Provider ID 拼写一致性

### 2. 模型列表获取失败

**错误：** `Failed to fetch models from provider`

**解决：**

- 检查 API 密钥是否正确
- 验证 baseURL 格式是否正确
- 检查网络连接和 CORS 设置
- 查看浏览器控制台详细错误信息

### 3. 聊天请求失败

**错误：** `Chat completion failed with status 401`

**解决：**

- 验证 API 密钥有效性
- 检查密钥格式（是否需要特定前缀）
- 确认密钥权限是否足够

### 4. 流式响应中断

**错误：** `Stream ended unexpectedly`

**解决：**

- 检查 Provider 的流式响应格式
- 验证 handleStream 实现是否正确
- 检查网络超时设置

### 5. 模型参数不匹配

**错误：** `Model does not support function calling`

**解决：**

- 在模型定义中正确设置 `functionCall: true/false`
- 在 Provider 配置中正确处理能力声明

### 6. Provider 特定错误码

```typescript
// 常见错误码映射参考
const errorCodeMap = {
  400: 'BadRequest',
  401: 'InvalidAPIKey',
  403: 'PermissionDenied',
  404: 'ModelNotFound',
  429: 'RateLimitExceeded',
  500: 'InternalServerError',
  502: 'BadGateway',
  503: 'ServiceUnavailable',
};
```

## 🧪 测试和验证

### 1. 单元测试

为你的 Provider 创建测试文件：

```typescript
// packages/model-runtime/src/myprovider/index.test.ts
import { LobeMyProviderAI } from './index';

describe('LobeMyProviderAI', () => {
  it('should create instance with correct config', () => {
    const instance = new LobeMyProviderAI({
      apiKey: 'test-key',
      baseURL: 'https://api.test.com',
    });

    expect(instance).toBeDefined();
  });

  // 更多测试...
});
```

### 2. 集成测试

测试 Provider 的完整流程：

```typescript
// 测试模型列表获取
const runtime = await ModelRuntime.initializeWithProvider('myprovider', {
  apiKey: 'your-test-key',
});

const models = await runtime.models();
expect(models).toBeDefined();
expect(models.length).toBeGreaterThan(0);

// 测试聊天功能
const response = await runtime.chat({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});

expect(response).toBeDefined();
```

### 3. 手动测试清单

- [ ] Provider 在设置页面正确显示
- [ ] API 密钥验证通过
- [ ] 模型列表正确加载
- [ ] 基本聊天功能正常
- [ ] 流式响应工作正常
- [ ] 错误处理正确（无效密钥、模型不存在等）
- [ ] 定价信息正确显示
- [ ] 多语言支持（如果适用）

## 📚 参考示例

### 简单 OpenAI 兼容 Provider

参考：`packages/model-runtime/src/openai/index.ts`

### 完全自定义 Provider

参考：`packages/model-runtime/src/anthropic/index.ts`

### 复杂认证 Provider

参考：`packages/model-runtime/src/bedrock/index.ts`

## 🔗 相关文件索引

### 配置文件

- `src/config/modelProviders/index.ts` - Provider 注册
- `src/config/modelProviders/[provider].ts` - Provider 配置
- `src/config/llm.ts` - 环境变量配置

### 模型库

- `packages/model-bank/src/aiModels/index.ts` - 模型注册
- `packages/model-bank/src/aiModels/[provider].ts` - 模型定义

### 运行时

- `packages/model-runtime/src/runtimeMap.ts` - 运行时映射
- `packages/model-runtime/src/[provider]/index.ts` - 运行时实现
- `packages/model-runtime/src/types/type.ts` - Provider 类型定义

### 服务端集成

- `src/server/modules/ModelRuntime/index.ts` - 参数映射
- `src/app/(backend)/webapi/models/[provider]/route.ts` - 模型列表 API

### 前端界面

- `src/app/[variants]/(main)/settings/provider/(detail)/[provider]/` - 设置页面

## 💡 最佳实践

### 1. 保持 API 兼容性

- 尽量使用 OpenAI 兼容格式
- 减少自定义参数处理
- 使用标准的错误码映射

### 2. 性能优化

- 实现流式响应
- 合理使用缓存
- 优化模型列表获取

### 3. 用户体验

- 提供清晰的错误信息
- 支持模型搜索和过滤
- 显示准确的定价信息

### 4. 维护性

- 编写充分的测试
- 添加详细的注释
- 遵循项目代码规范

## 🆘 获取帮助

如果遇到问题：

1. 查看现有 Provider 的实现作为参考
2. 检查控制台和网络请求的详细错误信息
3. 确保所有注册和配置步骤都已完成
4. 在开发社区寻求帮助

---

## 💡 核心要点总结

### 1. 类型一致性是最高优先级

- **输入标准化**：所有 Provider 必须接受 `ChatStreamPayload` 类型
- **输出标准化**：必须返回 `Response` 对象，包含格式化的流式数据
- **错误标准化**：使用 `ChatCompletionErrorPayload` 格式
- **模型标准化**：返回 `ChatModelCard[]` 格式

### 2. 界面自动生成

- **Provider 设置界面**：根据配置文件自动渲染，无需手动创建
- **模型配置界面**：根据模型定义自动分类和显示属性
- **自定义配置**：只有特殊需求时才需要自定义界面组件

### 3. 最小化实现原则

- 保持与现有 Provider 的一致性

### 4. 完整测试流程

1. 检查 Provider 在设置页面显示
2. 验证 API 密钥验证
3. 测试模型列表加载
4. 测试基本聊天功能
5. 验证流式响应
6. 测试错误处理

通过遵循本指南，你应该能够成功地为 LobeChat 添加新的 AI Provider。记住要测试所有功能并遵循项目的最佳实践。祝开发顺利！🚀
