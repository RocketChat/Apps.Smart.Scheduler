import {
	ISetting,
	SettingType,
} from '@rocket.chat/apps-engine/definition/settings';

export enum SettingEnum {
    AI_PROVIDER_OPTION_ID = 'ai-provider-option-id',
	MODEL_SELECTION = 'model-selection',
    SELF_HOSTED_MODEL = "selfhosted-llm",
    AI_MODEL_API_URL = 'api-url',
	AI_API_KEY = "api-key",
	AI_MODEL_NAME = 'ai-model-name',
	OPEN_AI = 'open-ai',
	GEMINI = 'gemini',
    LLAMA3_8B = 'llama3-8b',
    MISTRAL_7B = 'mistral-7b',
}

export const settings: ISetting[] = [
    {
		id: SettingEnum.AI_PROVIDER_OPTION_ID,
		type: SettingType.SELECT,
		packageValue: SettingEnum.SELF_HOSTED_MODEL,
		required: true,
		public: false,
		i18nLabel: 'Choose AI Provider',
		values: [
            {
				key: SettingEnum.SELF_HOSTED_MODEL,
				i18nLabel: 'Self Hosted LLM',
			},
			{
				key: SettingEnum.OPEN_AI,
				i18nLabel: 'OpenAI',
			},
			{
				key: SettingEnum.GEMINI,
				i18nLabel: 'Gemini',
			},
		],
	},
	{
		id: SettingEnum.MODEL_SELECTION,
		i18nLabel: 'Model selection',
		i18nDescription: 'Select Model.(For RocketChat Internal LLM)',
		type: SettingType.SELECT,
		values: [
			{ key: SettingEnum.LLAMA3_8B, i18nLabel: 'Llama3 8B' },
			{ key: SettingEnum.MISTRAL_7B, i18nLabel: 'Mistral 7B' },
		],
		required: false,
		public: true,
		packageValue: SettingEnum.LLAMA3_8B,
	},
    {
		id: SettingEnum.AI_MODEL_API_URL,
		type: SettingType.STRING,
		packageValue: '',
		required: false,
		public: false,
		i18nLabel: 'AI model api url(For Self Hosted Ollama)',
	},
    {
		id: SettingEnum.AI_API_KEY,
		type: SettingType.PASSWORD,
		packageValue: '',
		required: false,
		public: false,
		i18nLabel: 'AI API key(For Gemini and Openai)',
	},
    {
		id: SettingEnum.AI_MODEL_NAME,
		type: SettingType.STRING,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'AI model name',
	},
];
