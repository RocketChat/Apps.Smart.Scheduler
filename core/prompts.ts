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

export function constructFreeBusyPrompt(
    args: IConstraintArgs,
    user: IUser,
    response: IFreeBusyResponse
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

    const calendars = Object.keys(response.calendars);
    let prompt = `General Constraint
    - Preferable from ${dateTimeMin}Z to ${dateTimeMax}Z\n`;

    calendars.forEach((calendar) => {
        prompt += `\n${calendar}\n`;
        const busy = response.calendars[calendar].busy;
        if (busy.length !== 0) {
            busy.forEach((time) => {
                prompt += `- Busy from ${time.start} to ${time.end}\n`;
            });
        }
        prompt += `- Office hours from ${args.preferredDate}T01:00:00Z to ${args.preferredDate}T09:00:00Z\n`; // TODO: Hardcoded office hours
    });

    return prompt;
}
