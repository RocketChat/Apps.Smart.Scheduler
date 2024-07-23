import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { ASK_OFFSET_DAYS, ASK_TIME } from "../constants/prompts";

async function generateChatCompletions(
    app: App,
    http: IHttp,
    body: object
): Promise<string> {
    const model = await app
        .getAccessors()
        .environmentReader.getSettings()
        .getValueById("model");
    const url = `http://${model}/v1`;

    body = {
        ...body,
        model: model,
        temperature: 0,
    };

    const response = await http.post(url + "/chat/completions", {
        headers: {
            "Content-Type": "application/json",
        },
        content: JSON.stringify(body),
    });

    if (!response || !response.content) {
        throw new Error(
            "Something is wrong with the API. Please try again later"
        );
    }

    return JSON.parse(response.content).choices[0].message.content;
}

export async function getPreferredDate(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    const body = {
        messages: [
            {
                role: "system",
                content: ASK_OFFSET_DAYS,
            },
            {
                role: "user",
                content: prompt,
            },
        ],
        // format: "json",
    };

    const response = await generateChatCompletions(app, http, body);
    return response;
    // try {
    //     const offsetDays = JSON.parse(response).offset_days;
    //     if (offsetDays < 0) {
    //         throw new Error("Invalid offset days");
    //     }
    //     return getDateWithOffsetDays(offsetDays);
    // } catch (error) {
    //     throw new Error(`Invalid response from AI: ${response}`);
    // }
}

export async function getPreferredTime(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    const body = {
        messages: [
            {
                role: "system",
                content: ASK_TIME,
            },
            {
                role: "user",
                content: prompt,
            },
        ],
    };

    const response = await generateChatCompletions(app, http, body);
    return response;
}

export async function getGoogleCalendarAPIArguments(
    app: App,
    http: IHttp,
    prompt: string
): Promise<object> {
    throw new Error("Not implemented");
}

export async function getCommonTime(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    throw new Error("Not implemented");
}
