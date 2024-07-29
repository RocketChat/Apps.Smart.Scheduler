import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import {
    constructConstraintPrompt,
    constructPreferredDateTimePrompt,
} from "../core/prompts";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { timeToUTC } from "../lib/dateUtils";
import { sendNotification } from "../lib/messages";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { getConstraints } from "./googleCalendar";

async function generateChatCompletions(
    app: SmartSchedulingApp,
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

    try {
        return JSON.parse(response.content).choices[0].message.content;
    } catch (error) {
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
    prompt: string
): Promise<IMeetingArgs> {
    const body = {
        messages: [
            {
                role: "system",
                content: `Turn this prompt: 
                ${prompt}
                Into array of item using following format, example:
                [{
                    "datetimeStart": "2021-09-01T09:00:00Z", // Meeting start. Use ISO 8601 format
                    "datetimeEnd": "2021-09-01T17:00:00Z", // Meeting end. Use ISO 8601 format
                }]
                Do not output any other information. Only use the fields above.    
                `,
            },
        ],
        format: "json",
    };

    const response = await generateChatCompletions(app, http, body);
    const args: IMeetingArgs = JSON.parse(response);
    return args;
}

export async function generateConstraintPrompt(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    prompt: string,
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
        `-----------
        Preferred date time: 
        ${preferredDateTime}\n`
    );

    const args = await getConstraintArguments(app, http, preferredDateTime);

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `Args: ${JSON.stringify(args)} \n`
    );

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

    // DEBUG
    await sendNotification(
        read,
        modify,
        user,
        room,
        `Constraints: ${JSON.stringify(constraints)} \n
        -----------`
    );

    return constraintPrompt;
}
