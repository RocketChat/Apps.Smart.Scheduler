import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import {
    constructPreferredDateTimePrompt,
    construnctConstraintPrompt,
} from "../core/prompts";
import { IConstraintProps } from "../definitions/IConstraintProps";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { timeToUTC } from "../lib/dateUtils";
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

export async function getPreferredDateTime(
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

export async function getConstraintArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string
): Promise<IConstraintProps> {
    const body = {
        messages: [
            {
                role: "system",
                content: `Turn this prompt: ${prompt}, into the following JSON format.
                Example:
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
    const args: IConstraintProps = JSON.parse(response);
    return args;
}

export async function getConstraintPrompt(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    prompt: string
): Promise<string> {
    const preferredDateTime = await getPreferredDateTime(
        app,
        http,
        user.utcOffset,
        prompt
    );
    const args = await getConstraintArguments(app, http, preferredDateTime);
    const constraints = (await getConstraints(
        app,
        http,
        user,
        emails,
        args.preferredDate
    ).then((res) => res)) as IFreeBusyResponse;

    const timeMin = timeToUTC(args.preferredDate, args.timeMin, user.utcOffset);
    const timeMax = timeToUTC(args.preferredDate, args.timeMax, user.utcOffset);

    // return `
    // Preferred date time: ${preferredDateTime} \n
    // Args: ${JSON.stringify(args)} \n
    // Constraints: ${JSON.stringify(constraints)} \n
    // ${construnctConstraintPrompt(timeMin, timeMax, constraints)}
    // `;
    return construnctConstraintPrompt(timeMin, timeMax, constraints);
}

export async function getCommonTime(
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

export async function getMeetingArguments(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string
): Promise<string> {
    const body = {
        messages: [
            {
                role: "system",
                content: `Turn this prompt: ${prompt}, into the following JSON format.
                Example:
                {
                    "dateTimeMin": "2021-09-01T07:00:00Z", // iso format, YYYY-MM-DDTHH:MM:SSZ
                    "dateTimeMax": "2021-09-01T09:00:00Z", // iso format, YYYY-MM-DDTHH:MM:SSZ
                }`,
            },
        ],
        format: "json",
    };

    const response = await generateChatCompletions(app, http, body);
    return response;
}
