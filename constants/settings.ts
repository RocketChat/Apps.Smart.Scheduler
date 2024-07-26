import {
    ISetting,
    SettingType,
} from "@rocket.chat/apps-engine/definition/settings";

export const settings: ISetting[] = [
    {
        id: "model",
        i18nLabel: "Model selection",
        i18nDescription: "AI model to use for inference.",
        type: SettingType.SELECT,
        values: [
            { key: "mistral-7b", i18nLabel: "Mistral 7B" },
            { key: "llama3-8b", i18nLabel: "Llama3 8B" },
            { key: "llama3-70b", i18nLabel: "Llama3 70B" },
        ],
        required: true,
        public: true,
        packageValue: "mistral-7b",
    },
];
