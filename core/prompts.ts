import {
    COMMON_TIME_PROMPT,
    PREFERRED_DATETIME_PROMPT,
} from "../constants/prompts";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { getFormattedDate } from "../lib/dateUtils";

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
        })}`;
    }).join("\n");

    return PREFERRED_DATETIME_PROMPT.replace(
        "{prompt}",
        processedPrompt
    ).replace("{days}", days);
}

export function construnctConstraintPrompt(
    dateTimeMin: string,
    dateTimeMax: string,
    response: IFreeBusyResponse
): string {
    const calendars = Object.keys(response.calendars);

    let prompt = `General Constraints
    - Preferable from ${dateTimeMin} to ${dateTimeMax}\n`;

    calendars.forEach((calendar) => {
        const busy = response.calendars[calendar].busy;
        if (busy.length !== 0) {
            prompt += `\n${calendar}:\n`;
            busy.forEach((time) => {
                prompt += `- Busy from ${time.start
                    .replace("T", "")
                    .replace("Z", "")} to ${time.end
                    .replace("T", "")
                    .replace("Z", "")}\n`;
            });
        }
    });

    return COMMON_TIME_PROMPT.replace("{prompt}", prompt);
}
