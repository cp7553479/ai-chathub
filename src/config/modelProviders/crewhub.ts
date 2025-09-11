import { ModelProviderCard } from '@/types/llm';

const CrewHub: ModelProviderCard = {
  apiKeyUrl: 'https://crewhub.ai/api-keys',
  chatModels: [
    {
      contextWindowTokens: 128_000,
      description: '专为邮件处理优化的 AI 模型，支持邮件分类、回复建议和自动化处理',
      displayName: 'EmailCrew',
      enabled: true,
      functionCall: true,
      id: 'emailcrew',
      pricing: {
        units: [
          { name: 'textInput', rate: 0.01, strategy: 'fixed', unit: 'millionTokens' },
          { name: 'textOutput', rate: 0.02, strategy: 'fixed', unit: 'millionTokens' },
        ],
      },
      releasedAt: '2024-01-15',
      vision: false,
    },
  ],
  checkModel: 'emailcrew',
  description: 'CrewHub 是一个专业的 AI 邮件处理平台，提供高效的邮件分析和自动化处理服务。',
  enabled: true,
  id: 'crewhub',
  name: 'CrewHub',
  settings: {
    responseAnimation: 'smooth',
    showModelFetcher: true,
  },
  url: 'https://crewhub.ai',
};

export default CrewHub;
