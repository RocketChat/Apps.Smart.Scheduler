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
    
    app.getLogger().debug('Gemini API key not set Properly');
    app.getLogger().debug(
        `Request to  with payload: ${JSON.stringify(body)}`
    );
    const response = await handleResponse(body, app, http)

    app.getLogger().debug(`Response : ${JSON.stringify(response)}`);

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
    let aiProvider: string;
    
        aiProvider = await app
            .getAccessors()
            .environmentReader.getSettings()
            .getValueById(SettingEnum.AI_PROVIDER_OPTOIN_ID);


    switch (aiProvider) {
        case SettingEnum.SELF_HOSTED_MODEL:
            return handleSelfHostedModel(body, app, http);

        case SettingEnum.OPEN_AI:
            return handleOpenAI(body, app, http);

        case SettingEnum.GEMINI:
            return handleGemini(body, app, http);

        default:
            const errorMsg = "Error: AI provider is not configured correctly.";
            app.getLogger().log(errorMsg);
            return errorMsg;
    }
}

export async function handleSelfHostedModel(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp
): Promise<string> {
    try {
        const url = await app
        .getAccessors()
        .environmentReader.getSettings()
        .getValueById(SettingEnum.SELF_HOSTED_MODEL_ADDRESS_ID);

        if (!url) {
            app.getLogger().log('Self Hosted Model address not set.');
                return "Your Workspace AI is not set up properly. Please contact your administrator"
            }

        const response: IHttpResponse = await http.post(
            `${url}/chat/completions`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                content: JSON.stringify({
                    ...body,
                    temperature: 0,
                    stream: false,
                }),
            },
        );

        if (!response || !response.data) {
            app.getLogger().log('No response data received from AI.');
            return "Something went wrong. Please try again later.";
        }

        return response.data.choices[0].message.content;
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
    http: IHttp
): Promise<string> {
    try {
        const { openaikey, openaimodel } = await getOpenAIConfig(app);

        if (!openaikey || !openaimodel) {
            app.getLogger().log('OpenAI settings not set properly.');
            return "AI is not configured. Please contact your administrator to use this feature."
        }

        const response: IHttpResponse = await http.post(
            'https://api.openai.com/v1/chat/completions',
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openaikey}`,
                },
                content: JSON.stringify({
                    model: openaimodel,
                    ...body
                }),
            },
        );

        if (!response || !response.data) {
            app.getLogger().log('No response data received from AI.');
            return "Something went wrong. Please try again later.";
        }

        const { choices } = response.data;
        return choices[0].message.content;
    } catch (error) {
        app.getLogger().log(`Error in handleOpenAI: ${error.message}`);
        return "Something went wrong. Please try again later.";
    }
}


async function getOpenAIConfig(app: SmartSchedulingApp): Promise<{
    openaikey: string;
    openaimodel: string;
}> {
        const [apikey, model] = await Promise.all([
                app
                .getAccessors()
                .environmentReader.getSettings()
                .getValueById(SettingEnum.OPEN_AI_API_KEY_ID),
                app
                .getAccessors()
                .environmentReader.getSettings()
                .getValueById(SettingEnum.OPEN_AI_API_MODEL_ID),
        ]);
        return { openaikey: apikey, openaimodel: model };
}

async function handleGemini(
    body: any,
    app: SmartSchedulingApp,
    http: IHttp
): Promise<string> {
    try {
        const geminiAPIkey = await getGeminiAPIKey(app);

        if (!geminiAPIkey) {
            app.getLogger().log('Gemini API key not set Properly');
            return "AI is not configured. Please contact your administrator to use this feature.";
        }

        const response: IHttpResponse = await http.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiAPIkey}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                content: JSON.stringify({
                    ...body
                }),
            },
        );

        if (!response || !response.content) {
                app
                .getLogger()
                .log('No response content received from AI.');
            return "Something went wrong. Please try again later.";
        }

        const data = response.data;
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        app.getLogger().log(`Error in handleGemini: ${error.message}`);
        return "Something went wrong. Please try again later.";
    }
}

async function getGeminiAPIKey(app: SmartSchedulingApp): Promise<string> {

        return await app
            .getAccessors()
            .environmentReader.getSettings()
            .getValueById(SettingEnum.GEMINI_AI_API_KEY_ID);
    
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
            .getValueById(SettingEnum.AI_PROVIDER_OPTOIN_ID);

    let body: object;
    if(aiProvider === SettingEnum.GEMINI) {
        body = {
            contents: [
                {
                    parts: {
                        text: prompt
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
    app.getLogger().debug(
        `Request to  with payload: ${JSON.stringify(body)}`
    );  
    

    const response = await generateChatCompletions(app, http, body);
    return response;
}

export async function getConstraintArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string
): Promise<IConstraintArgs> {
    const body = {
        messages: [
            {
                role: "system",
                content: CONSTRAINT_ARGS_PROMPT.replace("{prompt}", prompt),
            },
        ],
        format: "json",
    };

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
    const body = {
        messages: [
            {
                role: "system",
                content: MEETING_ARGS_PROMPT.replace("{prompt}", prompt),
            },
        ],
        format: "json",
    };

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
    const body = {
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

    const response = await generateChatCompletions(app, http, body);
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

    const body = {
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
