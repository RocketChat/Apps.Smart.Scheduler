import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";

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

    return JSON.parse(response.content);
    // try {
    //     return JSON.parse(response.content).choices[0].message.content;
    // } catch (error) {
    //     throw new Error(`Invalid response from API: ${response}`);
    // }
}

export async function getPreferredDateTime(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    // TODO: Move the preprocess of prompt here

    const body = {
        messages: [
            {
                role: "system",
                content: prompt,
            },
        ],
    };

    const response = await generateChatCompletions(app, http, body);
    return response;
}

export async function getConstraintArguments(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    // To get date and time for google calendar API call
    throw new Error("Not implemented");
}

export async function getCommonTime(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    // To get common time for all participants
    throw new Error("Not implemented");
}

export async function getMeetingArguments(
    app: App,
    http: IHttp,
    prompt: string
): Promise<string> {
    // To set up a meeting with all participants
    throw new Error("Not implemented");
}
