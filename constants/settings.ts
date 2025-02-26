import {
	ISetting,
	SettingType,
} from '@rocket.chat/apps-engine/definition/settings';

export enum SettingEnum {
	AI_PROVIDER_OPTION_ID = 'ai-provider-option-id',
	SELF_HOSTED_MODEL_ADDRESS_ID = 'self-hosted-model-address-id',
	OPEN_AI_API_KEY_ID = ' open-ai-api-key-id',
	OPEN_AI_API_MODEL_ID = 'open-ai-api-model-id',
	GEMINI_AI_API_KEY_ID = 'gemini-ai-api-key-id',
    GEMINI_AI_API_MODEL_ID = 'gemini-ai-api-model-id',
    SELF_HOSTED_MODEL_NAME = 'self-hosted-model-name',
	SELF_HOSTED_MODEL = 'self-hosted-model',
	OPEN_AI = 'open-ai',
	GEMINI = 'gemini',
}

export const settings: Array<ISetting> = [
	{
		id: SettingEnum.AI_PROVIDER_OPTION_ID,
		type: SettingType.SELECT,
		packageValue: SettingEnum.SELF_HOSTED_MODEL,
		required: true,
		public: false,
		i18nLabel: 'AI Provider',
		values: [
			{
				key: SettingEnum.SELF_HOSTED_MODEL,
				i18nLabel: 'Self Hosted AI Model',
			},
			{
				key: SettingEnum.OPEN_AI,
				i18nLabel: 'Open AI',
			},
			{
				key: SettingEnum.GEMINI,
				i18nLabel: 'Gemini',
			},
		],
	},
	{
		id: SettingEnum.SELF_HOSTED_MODEL_ADDRESS_ID,
		type: SettingType.STRING,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Self Hosted AI Model URL',
	},
    {
		id: SettingEnum.SELF_HOSTED_MODEL_NAME,
		type: SettingType.STRING,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Self Hosted AI Model Name',
	},
	{
		id: SettingEnum.OPEN_AI_API_KEY_ID,
		type: SettingType.PASSWORD,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Open AI API Key',
	},
	{
		id: SettingEnum.OPEN_AI_API_MODEL_ID,
		type: SettingType.STRING,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Open AI Model',
	},
	{
		id: SettingEnum.GEMINI_AI_API_KEY_ID,
		type: SettingType.PASSWORD,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Gemini API Key',
	},
    {
		id: SettingEnum.GEMINI_AI_API_MODEL_ID,
		type: SettingType.STRING,
		packageValue: '',
		required: true,
		public: false,
		i18nLabel: 'Gemini Model',
        value: 'gemini-1.5-flash-latest'
	},
];
