import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { PREFERRED_DATETIME_PROMPT } from "../constants/prompts";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { getFormattedDate, timeToUTC } from "../lib/dateUtils";

export function constructPreferredDateTimePrompt(
    utcOffset: number,
    prompt: string
): string {
    const processedPrompt = `Given today is ${getFormattedDate(
        utcOffset
    )}. ${prompt}`;

    const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        return `- ${date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        })}`;
    }).join("\n");

    return PREFERRED_DATETIME_PROMPT.replace(
        "{prompt}",
        processedPrompt
    ).replace("{days}", days);
}

export function constructSchedule(
    preferredDate: string,
    response: IFreeBusyResponse,
    utcOffsets: number[]
): string {
    let prompt = "";

    const calendars = Object.keys(response.calendars);
    calendars.forEach((calendar, index) => {
        prompt += `\n${calendar}\n`;
        const busy = response.calendars[calendar].busy;
        if (busy.length !== 0) {
            busy.forEach((time) => {
                prompt += `- Busy from ${time.start} to ${time.end}\n`;
            });
        }

        const startTime = timeToUTC(
            preferredDate,
            "09:00:00",
            utcOffsets[index]
        );

        const endTime = timeToUTC(preferredDate, "17:00:00", utcOffsets[index]);

        prompt += `- Office hours from ${startTime} to ${endTime}\n`;
    });

    return prompt;
}

export function constructFreeBusyPrompt(
    args: IConstraintArgs,
    user: IUser,
    response: IFreeBusyResponse,
    utcOffsets: number[]
): string {
    const dateTimeMin = timeToUTC(
        args.preferredDate,
        args.timeMin,
        user.utcOffset
    );
    const dateTimeMax = timeToUTC(
        args.preferredDate,
        args.timeMax,
        user.utcOffset
    );

    let prompt = `General Constraint
    - Preferable from ${dateTimeMin}Z to ${dateTimeMax}Z\n`;

    prompt += constructSchedule(args.preferredDate, response, utcOffsets);

    return prompt;
}
