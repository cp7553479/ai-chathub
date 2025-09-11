import { AIChatModelCard } from '../types/aiModel';

export const crewhubChatModels: AIChatModelCard[] = [
  {
    abilities: {
      functionCall: true,
      reasoning: false,
      search: false,
      vision: false,
    },
    contextWindowTokens: 128_000,
    description:
      'EmailCrew 是专为邮件处理优化的 AI 模型，支持邮件分类、回复建议和自动化处理，具有高精度的邮件内容理解能力',
    displayName: 'EmailCrew',
    enabled: true,
    id: 'emailcrew',
    maxOutput: 8192,
    pricing: {
      units: [
        { name: 'textInput', rate: 10, strategy: 'fixed', unit: 'millionTokens' },
        { name: 'textOutput', rate: 20, strategy: 'fixed', unit: 'millionTokens' },
      ],
    },
    releasedAt: '2024-01-15',
    settings: {
      extendParams: ['disableContextCaching'],
    },
    type: 'chat',
  },
];

export const allModels = [...crewhubChatModels];

export default allModels;
