import { IHttp, IHttpResponse } from "@rocket.chat/apps-engine/definition/accessors";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { SettingEnum } from "../constants/settings";

type AIResponseFormat = 'json' | 'text';
type ResponseFormatConfig =
    | { response_format: { type: 'json_object' } }
    | { generationConfig: { responseMimeType: 'application/json' } }
    | { format: 'json' }
    | {};

export const AI_PROVIDERS = {
    [SettingEnum.ROCKETCHAT_INTERNAL_MODEL]: {
    constructUrl: ({ baseModel }) => `http://${baseModel}/v1/chat/completions`,
    constructHeaders: () => ({ 'Content-Type': 'application/json' }),
    prepareBody: (prompt) => ({
        messages: [{ role: "system", content: prompt }],
    }),
    getResponseFormat: (format): ResponseFormatConfig =>
        format === 'json' ? { response_format: { type: "json_object" } } : {},
    extractResponse: (data) => data.choices[0].message.content
},

    [SettingEnum.OPEN_AI]: {
    constructUrl: ({ apiUrl }) => "https://api.openai.com/v1/chat/completions",
    constructHeaders: (apiKey) => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
    }),
    prepareBody: (prompt) => ({
        messages: [{ role: "system", content: prompt }],
    }),
    getResponseFormat: (format): ResponseFormatConfig =>
        format === 'json' ? { response_format: { type: "json_object" } } : {},
    extractResponse: (data) => data.choices[0].message.content
},

    [SettingEnum.GEMINI]: {
    constructUrl: ({ model, apiKey }) =>
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    constructHeaders: () => ({ 'Content-Type': 'application/json' }),
    prepareBody: (prompt) => ({
        contents: [{ parts: [{ text: prompt }] }],
    }),
    getResponseFormat: (format): ResponseFormatConfig =>
        format === 'json' ? { generationConfig: { responseMimeType: "application/json" } } : {},
    extractResponse: (data) => data.candidates[0].content.parts[0].text
},

    [SettingEnum.SELF_HOSTED_MODEL]: {
    constructUrl: ({ apiUrl }) => apiUrl,
    constructHeaders: () => ({ 'Content-Type': 'application/json' }),
    prepareBody: (prompt) => ({
        prompt: prompt,
        stream: false,
    }),
    getResponseFormat: (format): ResponseFormatConfig =>
        format === 'json' ? { format: "json" } : {},
    extractResponse: (data) => data.response
}
};

export function constructBodyOptions(
    provider: SettingEnum,
    options: {
    responseFormat?: AIResponseFormat;
    temperature?: number;
    maxTokens?: number;
}
): object {
    const config = AI_PROVIDERS[provider];
    let formatOptions: ResponseFormatConfig = {};

    if (options.responseFormat) {
    formatOptions = config.getResponseFormat(options.responseFormat);
}

    return {
    ...formatOptions,
    ...(options.temperature !== undefined && { temperature: options.temperature }),
    ...(options.maxTokens !== undefined && { maxTokens: options.maxTokens })
    };
}

export async function handleAIRequest(
    app: SmartSchedulingApp,
    http: IHttp,
    options: {
    prompt: string;
    responseFormat?: AIResponseFormat;
    temperature?: number;
    }
): Promise<string> {
    try {
    const provider = await app.getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);

    let model: string;
    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);

    if(aiProvider === SettingEnum.ROCKETCHAT_INTERNAL_MODEL){
            model = await app
            .getAccessors()
            .environmentReader.getSettings()
            .getValueById(SettingEnum.MODEL_SELECTION)
        }
        else {
            model = await app
            .getAccessors()
            .environmentReader.getSettings()
            .getValueById(SettingEnum.AI_MODEL_NAME)
    }

    const {prompt, responseFormat, temperature } = options;
    const config = AI_PROVIDERS[provider];

    const [apiKey, apiUrl, baseModel] = await Promise.all([
        app.getAccessors().environmentReader.getSettings().getValueById(SettingEnum.AI_API_KEY),
        app.getAccessors().environmentReader.getSettings().getValueById(SettingEnum.AI_MODEL_API_URL),
        app.getAccessors().environmentReader.getSettings().getValueById(SettingEnum.MODEL_SELECTION)
    ]);

    let requestBody
    if(aiProvider === SettingEnum.GEMINI){
        requestBody = {
            ...config.prepareBody(prompt),
            ...constructBodyOptions(provider, { responseFormat })
            };
    }
    else{
        requestBody = {
            ...config.prepareBody(prompt),
            ...constructBodyOptions(provider, { responseFormat, temperature })
            };
    }


    const url = config.constructUrl({ apiUrl, apiKey, model, baseModel });

    app.getLogger().debug(`final model ${model}`);
    app.getLogger().debug(`requesr body ${JSON.stringify(requestBody)}`)

    const response: IHttpResponse = await http.post(url, {
        headers: config.constructHeaders(apiKey),
        content: JSON.stringify({
        ...requestBody,
        model: model
    })
    });

    app.getLogger().debug(response)

    if (!response.content) {
        throw new Error('Empty AI response');
    }

    return config.extractResponse(JSON.parse(response.content));
    } catch (error) {
    app.getLogger().error(`AI Request failed: ${error.message}`);
    throw new Error('AI processing failed. Please try again.');
    }
}

export async function getJSONResponse(
    app: SmartSchedulingApp,
    http: IHttp,
    promptTemplate: string,
    ) {

    const response = await handleAIRequest(app, http, {
        prompt: promptTemplate,
        responseFormat: 'json',
        temperature: 0.7
    });

    return JSON.parse(response);
}
