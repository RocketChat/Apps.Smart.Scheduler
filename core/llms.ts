import {
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { PREFFERED_ARGS_KEY } from "../constants/keys";
import {
    constructConstraintPrompt,
    constructPreferredDateTimePrompt,
} from "../core/prompts";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { storeData } from "../lib/dataStore";
import { timeToUTC } from "../lib/dateUtils";
import { sendNotification } from "../lib/messages";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { getConstraints } from "./googleCalendar";

export async function generateChatCompletions(
    app: SmartSchedulingApp,
    http: IHttp,
    body: object
): Promise<string> {
    // const model = await app
    //     .getAccessors()
    //     .environmentReader.getSettings()
    //     .getValueById("model");
    // const url = `http://${model}/v1` + "/chat/completions";
    // body = {
    //     ...body,
    //     model: model,
    //     temperature: 0,
    // };

    const model = "mistral";
    const url = "http://host.docker.internal:11434/api/chat";
    body = {
        ...body,
        model: model,
        temperature: 0,
        options: { temperature: 0 },
        stream: false,
    };

    app.getLogger().debug(
        `Request to ${url} with payload: ${JSON.stringify(body)}`
    );

    const response = await http.post(url, {
        headers: {
            "Content-Type": "application/json",
        },
        content: JSON.stringify(body),
    });

    app.getLogger().debug(`Response from ${url}: ${JSON.stringify(response)}`);

    if (!response || !response.content) {
        throw new Error(
            "Something is wrong with the API. Please try again later"
        );
    }

    try {
        return JSON.parse(response.content).message.content;
        // return JSON.parse(response.content).choices[0].message.content;
    } catch (error) {
        app.getLogger().error(`Error parsing response: ${error}`);
        throw new Error(`Invalid response from API: ${response}`);
    }
}

export async function generatePreferredDateTime(
    app: SmartSchedulingApp,
    http: IHttp,
    utcOffset: number,
    prompt: string
): Promise<string> {
    const body = {
        messages: [
            {
                role: "system",
                content: constructPreferredDateTimePrompt(utcOffset, prompt),
            },
        ],
    };

    const response = await generateChatCompletions(app, http, body);
    return response;
}

export async function generateCommonTime(
    app: SmartSchedulingApp,
    http: IHttp,
    constraintPrompt: string
): Promise<string> {
    return `2024-09-02T02:30:00Z to 2024-09-02T03:00:00Z`;
    const body = {
        messages: [
            {
                role: "system",
                content: constraintPrompt,
            },
        ],
    };

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
                content: `Turn this prompt: 
                ${prompt}
                Into the following format, example:
                {
                    "preferredDate": "2021-09-01", // YYYY-MM-DD
                    "timeMin": "09:00:00", // HH:MM:SS
                    "timeMax": "17:00:00", // HH:MM:SS
                }`,
            },
        ],
        format: "json",
    };

    const response = await generateChatCompletions(app, http, body);
    const args: IConstraintArgs = JSON.parse(response);
    return args;
}

export async function getMeetingArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string,
    // DEBUG
    user: IUser,
    read: any,
    modify: any,
    room: any
): Promise<IMeetingArgs> {
    const body = {
        messages: [
            {
                role: "system",
                content: `Turn this prompt: 
                ${prompt}
                Into array of item using following format, example:
                {
                    "datetimeStart": "2021-09-01T09:00:00Z", // Meeting start. Use ISO 8601 format
                    "datetimeEnd": "2021-09-01T17:00:00Z", // Meeting end. Use ISO 8601 format
                }
                Do not output any other information. Only use the fields above.    
                `,
            },
        ],
        format: "json",
    };

    const response = await generateChatCompletions(app, http, body);
    const args: IMeetingArgs = JSON.parse(response);

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `> Generated meeting arguments: ${JSON.stringify(args)}\n`
    );

    return args;
}

export async function generateConstraintPrompt(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    prompt: string,
    persistence: IPersistence,
    // DEBUG
    read: any,
    modify: any,
    room: any
): Promise<string> {
    const preferredDateTime = await generatePreferredDateTime(
        app,
        http,
        user.utcOffset,
        prompt
    );

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `Prompt: ${prompt}
        -----------
        Preferred date time: 
        ${preferredDateTime}\n`
    );

    const args = await getConstraintArguments(app, http, preferredDateTime);

    await storeData(persistence, user.id, PREFFERED_ARGS_KEY, args);

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `Args: ${JSON.stringify(args)} \n`
    );

    const constraintPrompt = await generateConstraintPromptHelper(
        app,
        http,
        user,
        emails,
        args
    );

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `Constraints: 
        ${constraintPrompt}
        -----------`
    );

    return constraintPrompt;
}

export async function generateConstraintPromptHelper(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    args: IConstraintArgs
): Promise<string> {
    const constraints = (await getConstraints(
        app,
        http,
        user,
        emails,
        args.preferredDate
    ).then((res) => res)) as IFreeBusyResponse;

    const timeMin = timeToUTC(args.preferredDate, args.timeMin, user.utcOffset);
    const timeMax = timeToUTC(args.preferredDate, args.timeMax, user.utcOffset);

    const constraintPrompt = constructConstraintPrompt(
        timeMin,
        timeMax,
        constraints
    );

    return constraintPrompt;
}
