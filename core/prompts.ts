import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { PREFERRED_DATETIME_PROMPT } from "../constants/prompts";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { getFormattedDate, offsetTime } from "../lib/dateUtils";

export function constructPreferredDateTimePrompt(
    utcOffset: number,
    prompt: string,
    base_prompt: string = PREFERRED_DATETIME_PROMPT
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

    return base_prompt
        .replace("{prompt}", processedPrompt)
        .replace("{days}", days);
}

export function constructSchedule(
    preferredDate: string,
    response: IFreeBusyResponse,
    utcOffsets: number[],
    usernames?: string[],
    officeHours: boolean = true
): string {
    let prompt = "";

    const calendars = Object.keys(response.calendars);
    calendars.forEach((calendar, index) => {
        prompt += `\n${
            usernames ? "Schedule for " + usernames[index] + " / " : ""
        }${calendar}\n`;

        const busy = response.calendars[calendar].busy;
        if (busy.length !== 0) {
            busy.forEach((time) => {
                prompt += `- Busy from ${time.start} to ${time.end}\n`;
            });
        }

        const startTime = offsetTime(
            preferredDate,
            "09:00:00",
            utcOffsets[index]
        );

        const endTime = offsetTime(
            preferredDate,
            "17:00:00",
            utcOffsets[index]
        );

        if (officeHours) {
            prompt += `- Office hours from ${startTime} to ${endTime}\n`;
        }
    });

    return prompt;
}

export function constructFreeBusyPrompt(
    args: IConstraintArgs,
    user: IUser,
    response: IFreeBusyResponse,
    utcOffsets: number[]
): string {
    const dateTimeMin = offsetTime(
        args.preferredDate,
        args.timeMin,
        user.utcOffset
    );
    const dateTimeMax = offsetTime(
        args.preferredDate,
        args.timeMax,
        user.utcOffset
    );

    let prompt = `General Constraint
    - Preferable from ${dateTimeMin}Z to ${dateTimeMax}Z\n`;

    prompt += constructSchedule(args.preferredDate, response, utcOffsets);

    return prompt;
}

export function constructReminderPrompt(
    user: IUser,
    prompt: string,
    participants: string[],
    args: IConstraintArgs
): string {
    let modifiedParticipants = [
        user.emails[0].address + "|" + user.utcOffset,
        ...participants,
    ];
    const emails = modifiedParticipants.map((participant) =>
        participant.split("|")[0].trim()
    );

    const reminderPrompt = `Set a reminder based on this prompt:
    ${prompt}
    And this preference
    - Date: ${args.preferredDate}
    - Time: ${args.timeMin} to ${args.timeMax}
    - Participants: ${emails}
    - Duration: 15 minutes
    `;

    return reminderPrompt;
}
