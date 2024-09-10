import {
    IHttp,
    IPersistence,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { PREFFERED_ARGS_KEY } from "../constants/keys";
import {
    CONSTRAINT_ARGS_PROMPT,
    MEETING_ARGS_PROMPT,
    RECOMMENDED_COMMON_TIME_PROMPT,
} from "../constants/prompts";
import {
    constructFreeBusyPrompt,
    constructPreferredDateTimePrompt,
} from "../core/prompts";
import { ICommonTimeString } from "../definitions/ICommonTime";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { storeData } from "../lib/dataStore";
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
    // return `2024-09-09T02:30:00Z to 2024-09-09T03:00:00Z`;
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
    user: IUser,
    prompt: string,
    persistence: IPersistence
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

    const constraintPrompt = constructFreeBusyPrompt(args, user, constraints);
    return constraintPrompt;
}

export async function getRecommendedTime(
    app: SmartSchedulingApp,
    http: IHttp,
    prompt: string,
    commonTimes: ICommonTimeString[]
): Promise<string> {
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
    return response;
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
