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
import { getJSONResponse, handleAIRequest } from "../lib/aiProvider";


export async function generatePreferredDateTime(
    app: SmartSchedulingApp,
    http: IHttp,
    utcOffset: number,
    prompt: string
): Promise<string> {

    const finalPrompt = constructPreferredDateTimePrompt(utcOffset, prompt)

    const response = await handleAIRequest(
        app,
        http,
        {
            prompt: finalPrompt,
        }
    )

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

    const finalprompt = CONSTRAINT_ARGS_PROMPT.replace("{prompt}", prompt);

    const response = await getJSONResponse(
        app,
        http,
        finalprompt
    )

    const args: IConstraintArgs = response;
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

    const finalPromt = MEETING_ARGS_PROMPT.replace("{prompt}", prompt)

    const response = await getJSONResponse(
        app,
        http,
        finalPromt
    )

    const args: IMeetingArgs = response;

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

    const finalPrompt = constructPreferredDateTimePrompt(
        user.utcOffset,
        prompt,
        ASK_FUNCTION_CALL_PROMPT
    )

    const response = await getJSONResponse(
        app,
        http,
        finalPrompt
    )

    return response as IFunctionCall;
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

    const finalPrompt = RECOMMENDED_COMMON_TIME_PROMPT.replace(
        "{prompt}",
        prompt
    ).replace("{common_time}", commonTimePrompt)

    const response = await handleAIRequest(
        app,
        http,
        {
            prompt: finalPrompt,
        }
    )

    await sendNotification(
        read,
        modify,
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
