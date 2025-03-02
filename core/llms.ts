import {
    IHttp,
    IHttpResponse,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { COMMON_TIMES_KEY, PREFFERED_ARGS_KEY } from "../constants/keys";
import {
    ASK_FUNCTION_CALL_PROMPT,
    CONSTRAINT_ARGS_PROMPT,
    MEETING_ARGS_PROMPT,
    RECOMMENDED_COMMON_TIME_PROMPT,
} from "../constants/prompts";
import {
    constructFreeBusyPrompt,
    constructPreferredDateTimePrompt,
    constructReminderPrompt,
} from "../core/prompts";
import { ICommonTimeString } from "../definitions/ICommonTime";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { IFunctionCall } from "../definitions/IFunctionCall";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { storeData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { CommonTimeExtractor } from "./algorithm";
import { getFreeBusySchedule } from "./googleCalendar";
import { SettingEnum } from "../constants/settings";

export async function generateChatCompletions(
    app: SmartSchedulingApp,
    http: IHttp,
    body: object
): Promise<string> {
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

    const mainBody = {...body, model: model}

    const response = await handleResponse(mainBody, app, http);

    if (!response) {
        throw new Error(
            "Something is wrong with the API. Please try again later"
        );
    }

    try {
        return response;
    } catch (error) {
        app.getLogger().error(`Error parsing response: ${error}`);
        throw new Error(
            `Invalid response from API: ${JSON.stringify(response)}`
        );
    }
}

export async function handleResponse(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp
): Promise<string> {

    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);

    const apiKey = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_API_KEY);

    const apiUrl = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_MODEL_API_URL);

    const safeUrl = cleanApiUrl(apiUrl)

    switch (aiProvider) {
        case SettingEnum.ROCKETCHAT_INTERNAL_MODEL:
            return await handleInternalLLM(body, app, http);

        case SettingEnum.SELF_HOSTED_MODEL:
            return await handleSelfHostedModel(body, app, http, safeUrl);

        case SettingEnum.OPEN_AI:
            return await handleOpenAI(body, app, http, safeUrl, apiKey);

        case SettingEnum.GEMINI:
            return await handleGemini(body, app, http, apiKey);

        default: {
            const errorMsg = 'Error: AI provider is not configured correctly.';
            app.getLogger().log(errorMsg);
            return errorMsg;
        }
    }

}

async function handleInternalLLM(
    body: object,
    app : SmartSchedulingApp,
    http: IHttp,
): Promise<string> {
    try {

        const modelname = await app
		.getAccessors()
		.environmentReader.getSettings()
		.getValueById(SettingEnum.MODEL_SELECTION);

        const response: IHttpResponse = await http.post(
            `http://${modelname}/v1/chat/completions`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                content: JSON.stringify({
                    ...body,
                    temperature: 0,
                }),
            });

            if (!response || !response.data) {
                app.getLogger().log('No response data received from AI.');
                return "Something went wrong. Please try again later.";
            }

            const { choices } = response.data;
            app.getLogger().debug(choices);
            return choices[0].message.content;

    } catch (error) {
            app
            .getLogger()
            .log(`Error in handleInternalLLM: ${error.message}`);
        return "Something went wrong. Please try again later.";
}
}

async function handleSelfHostedModel(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp,
    apiUrl: string
): Promise<string> {
    try {

        if (!apiUrl) {
            app.getLogger().log('Self Hosted Model address not set.');
                return "Your Workspace AI is not set up properly. Please contact your administrator"
            }
            const response: IHttpResponse = await http.post(
                `${apiUrl}/api/chat`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    content: JSON.stringify({
                        ...body,
                        stream: false,
                        temperature: 0,
                    }),
                },
            );

            if (!response || !response.data) {
                app.getLogger().log('No response data received from AI.');
                return "Something went wrong. Please try again later.";
            }

            const {message}= response.data
            app.getLogger().debug(message.content)
            return message.content ;
    } catch (error) {
            app
            .getLogger()
            .log(`Error in handleSelfHostedModel: ${error.message}`);
        return "Something went wrong. Please try again later.";
}
}

async function handleOpenAI(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp,
    apiUrl: string,
    apiKey: string
): Promise<string> {
    try {
        if (!apiKey || !apiUrl) {
            app.getLogger().log('OpenAI settings not set properly.');
            return "AI is not configured. Please contact your administrator to use this feature."
        }

        const response: IHttpResponse = await http.post(
            `${apiUrl}/v1/chat/completions`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                content: JSON.stringify({
                    ...body,
                    temperature: 0,
                }),
            },
        );
        if (!response || !response.data) {
            app.getLogger().log('No response data received from AI.');
            return "Something went wrong. Please try again later.";
        }

        const { choices } = response.data;
        app.getLogger().debug(choices[0].message.content);
        return choices[0].message.content;
    } catch (error) {
        app.getLogger().log(`Error in handleOpenAI: ${error.message}`);
        return "Something went wrong. Please try again later.";
    }
}


async function handleGemini(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp,
    apiKey: string
): Promise<string> {
    try {
        if (!apiKey) {
            app.getLogger().log('Gemini API key is missing.');
            return "AI is not configured. Please contact your administrator to use this feature.";
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent?key=${apiKey}`;
        const response: IHttpResponse = await http.post(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
            },
            content: JSON.stringify(body),
        });

        if (!response || !response.data) {
            app.getLogger().log('No response data received from Gemini.');
            return "Something went wrong. Please try again later.";
        }

        const data = response.data;
        app.getLogger().debug(`Response : ${JSON.stringify(data.candidates[0].content.parts[0].text)}`);
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        app.getLogger().log(`Error in handleGemini: ${error.message}`);
        return "Something went wrong. Please try again later.";
    }
}

function cleanApiUrl(apiUrl: string): string {
    return apiUrl.replace(/(\/v1\/chat\/completions|\/api\/chat|\/chat\/completions|\/v1\/chat|\/api\/generate)\/?$/, '');
}


export async function generatePreferredDateTime(
    app: SmartSchedulingApp,
    http: IHttp,
    utcOffset: number,
    prompt: string
): Promise<string> {

    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);


    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: constructPreferredDateTimePrompt(utcOffset, prompt),
                    },
                },
            ],
        }
    }
    else {
        body = {
            messages: [
                {
                    role: "system",
                    content: constructPreferredDateTimePrompt(utcOffset, prompt),
                },
            ],
        };
    }


    const response = await generateChatCompletions(app, http, body);
    return response;
}

export async function getConstraintArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string
): Promise<IConstraintArgs> {

    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);


    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: CONSTRAINT_ARGS_PROMPT.replace("{prompt}", prompt),
                    },
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        }
    }
    else if(aiProvider === SettingEnum.OPEN_AI && aiProvider === SettingEnum.ROCKETCHAT_INTERNAL_MODEL) {
        body = {
            messages: [
                {
                    role: "system",
                    content: CONSTRAINT_ARGS_PROMPT.replace("{prompt}", prompt),
                },
            ],
            response_format: { type: "json_object" }
        };
    }
    else {
        body = {
            messages: [
                {
                    role: "system",
                    content: CONSTRAINT_ARGS_PROMPT.replace("{prompt}", prompt),
                },
            ],
            format: "json",
        };
    }

    const response = await generateChatCompletions(app, http, body);
    const args: IConstraintArgs = JSON.parse(response);
    return args;
}

export async function generateConstraintPrompt(
    app: SmartSchedulingApp,
    http: IHttp,
    persistence: IPersistence,
    user: IUser,
    prompt: string
): Promise<IConstraintArgs> {

    const preferredDateTime = await generatePreferredDateTime(
        app,
        http,
        user.utcOffset,
        prompt
    );

    const args = await getConstraintArguments(app, http, preferredDateTime);

    await storeData(persistence, user.id, PREFFERED_ARGS_KEY, args);

    return args;
}

export async function generatePromptForAlgorithm(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    participants: string[],
    args: IConstraintArgs
): Promise<string> {
    let modifiedParticipants = [
        user.emails[0].address + "|" + user.utcOffset,
        ...participants,
    ];
    const emails = modifiedParticipants.map((participant) =>
        participant.split("|")[0].trim()
    );
    const utcOffsets = modifiedParticipants.map((participant) =>
        parseInt(participant.split("|")[1])
    );

    const constraints = (await getFreeBusySchedule(
        app,
        http,
        user,
        emails,
        args.preferredDate
    ).then((res) => res)) as IFreeBusyResponse;

    const constraintPrompt = constructFreeBusyPrompt(
        args,
        user,
        constraints,
        utcOffsets
    );

    return constraintPrompt;
}

export async function getCommonTimeInString(
    app: SmartSchedulingApp,
    http: IHttp,
    persistence: IPersistence,
    user: IUser,
    participants: string[],
    args: IConstraintArgs
): Promise<any> {
    const prompt = await generatePromptForAlgorithm(
        app,
        http,
        user,
        participants,
        args
    );

    const extractor = new CommonTimeExtractor(prompt);
    extractor.extract();

    await storeData(
        persistence,
        user.id,
        COMMON_TIMES_KEY,
        extractor.getResultInDateTime()
    );

    return extractor.getResultInDateTime();
}

export async function getMeetingArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string
): Promise<IMeetingArgs> {

    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);


    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: MEETING_ARGS_PROMPT.replace("{prompt}", prompt),
                    },
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        }
    }
    else if(aiProvider === SettingEnum.OPEN_AI && aiProvider === SettingEnum.ROCKETCHAT_INTERNAL_MODEL) {
        body = {
            messages: [
                {
                    role: "system",
                    content: MEETING_ARGS_PROMPT.replace("{prompt}", prompt),
                },
            ],
            response_format: { type: "json_object" }
        };
    }
    else {
        body = {
            messages: [
                {
                    role: "system",
                    content: MEETING_ARGS_PROMPT.replace("{prompt}", prompt),
                },
            ],
            format: "json",
        };
    }

    const response = await generateChatCompletions(app, http, body);
    const args: IMeetingArgs = JSON.parse(response);

    return args;
}

export async function getFunction(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    prompt: string
): Promise<IFunctionCall> {
    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);


    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: constructPreferredDateTimePrompt(
                            user.utcOffset,
                            prompt,
                            ASK_FUNCTION_CALL_PROMPT
                        ),
                    },
                },
            ],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        }
    }
    else if(aiProvider === SettingEnum.OPEN_AI && aiProvider === SettingEnum.ROCKETCHAT_INTERNAL_MODEL) {
        body = {
            messages: [
                {
                    role: "system",
                    content: constructPreferredDateTimePrompt(
                        user.utcOffset,
                        prompt,
                        ASK_FUNCTION_CALL_PROMPT
                    ),
                },
            ],
            response_format: { type: "json_object" }
        };
    }
    else {
        body = {
            raw: true,
            messages: [
                {
                    role: "system",
                    content: constructPreferredDateTimePrompt(
                        user.utcOffset,
                        prompt,
                        ASK_FUNCTION_CALL_PROMPT
                    ),
                },
            ],
            format: "json",
        };
    }


    const response = await generateChatCompletions(app, http, body);
    app.getLogger().debug(response)
    return JSON.parse(response) as IFunctionCall;
}

export async function getRecommendedTime(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string,
    commonTimes: ICommonTimeString[],
    // DEBUG
    read: IRead,
    modify: IModify,
    user: IUser,
    room: IRoom
): Promise<IMeetingArgs> {
    let commonTimePrompt = "";
    commonTimes.forEach((commonTime, index) => {
        commonTimePrompt += `${
            index + 1
        }. Participants: ${commonTime.participants.join(", ")}
        Time: ${commonTime.time[0]} to ${commonTime.time[1]}
        Max duration: ${
            new Date(commonTime.time[1]).getMinutes() -
            new Date(commonTime.time[0]).getMinutes()
        } minutes
        ----------------`;
    });

    const aiProvider = await app
    .getAccessors()
    .environmentReader.getSettings()
    .getValueById(SettingEnum.AI_PROVIDER_OPTION_ID);


    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: RECOMMENDED_COMMON_TIME_PROMPT.replace(
                            "{prompt}",
                            prompt
                        ).replace("{common_time}", commonTimePrompt),
                    },
                },
            ],
        }
    }
    else if(aiProvider === SettingEnum.OPEN_AI && aiProvider === SettingEnum.ROCKETCHAT_INTERNAL_MODEL) {
        body = {
            messages: [
                {
                    role: "system",
                    content: RECOMMENDED_COMMON_TIME_PROMPT.replace(
                        "{prompt}",
                        prompt
                    ).replace("{common_time}", commonTimePrompt),
                },
            ],
        };
    }
    else {
        body = {
            messages: [
                {
                    role: "system",
                    content: RECOMMENDED_COMMON_TIME_PROMPT.replace(
                        "{prompt}",
                        prompt
                    ).replace("{common_time}", commonTimePrompt),
                },
            ],
        };
    }


    const response = await generateChatCompletions(app, http, body);

    await sendNotification(
        this.read,
        this.modify,
        user,
        room,
        `Just a little more... ;)`
    );

    const meetingArgs = await getMeetingArguments(app, http, response);

    return meetingArgs;
}

export async function getReminder(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    participants: string[],
    prompt: string,
    constraintArgs: IConstraintArgs
): Promise<IMeetingArgs> {
    let modifiedParticipants = [
        user.emails[0].address + "|" + user.utcOffset,
        ...participants,
    ];
    const emails = modifiedParticipants.map((participant) =>
        participant.split("|")[0].trim()
    );

    const reminderPrompt = constructReminderPrompt(
        user,
        prompt,
        emails,
        constraintArgs
    );

    const meetingArgs = await getMeetingArguments(app, http, reminderPrompt);
    return meetingArgs;
}
