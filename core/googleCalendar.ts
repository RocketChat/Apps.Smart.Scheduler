import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { checkAvailability } from "../lib/googleCalendarSDK";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

interface IFreeBusyResponse {
    kind: string;
    timeMin: string;
    timeMax: string;
    calendars: {
        [email: string]: {
            busy: {
                start: string;
                end: string;
            }[];
        };
    };
}

function construnctConstraintPrompt(response: IFreeBusyResponse): string {
    const calendars = Object.keys(response.calendars);

    let constraint = "";
    calendars.forEach((calendar) => {
        const busy = response.calendars[calendar].busy;
        if (busy.length === 0) {
            // constraint += `No constraints for ${calendar}\n`;
        } else {
            constraint += `Constraints for ${calendar}:\n`;
            busy.forEach((time) => {
                constraint += `- Busy from ${time.start} to ${time.end}\n`;
            });
        }
    });

    return constraint;
}

export async function getConstraints(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    date: string
): Promise<string> {
    const accessToken = await app
        .getOauth2ClientInstance()
        .getAccessTokenForUser(user)
        .then((res) => res);

    if (!accessToken) {
        throw new Error("Access token not found");
    }
    const timeMin = new Date(date);
    const timeMax = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000);

    const response = await checkAvailability(
        accessToken.token,
        http,
        emails,
        timeMin.toISOString(),
        timeMax.toISOString()
    );

    return construnctConstraintPrompt(response as IFreeBusyResponse);
}

export async function setMeeting(
    emails: string[],
    time: string
): Promise<object> {
    throw new Error("Not implemented");
    // const event = await createEvent(credentials, emails, time);
    // return event;
}
