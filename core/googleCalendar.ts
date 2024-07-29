import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { checkAvailability } from "../lib/googleCalendarSDK";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

export async function getConstraints(
    app: SmartSchedulingApp,
    http: IHttp,
    user: IUser,
    emails: string[],
    date: string
): Promise<object> {
    const accessToken = await app
        .getOauth2ClientInstance()
        .getAccessTokenForUser(user);

    if (!accessToken) {
        throw new Error("Access token not found");
    }
    const timeMin = new Date(date);
    const timeMax = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000);

    const response = await checkAvailability(
        accessToken.token,
        http,
        [user.emails[0].address, ...emails],
        timeMin.toISOString(),
        timeMax.toISOString()
    );

    return response;
}

export async function setMeeting(
    emails: string[],
    time: string
): Promise<object> {
    throw new Error("Not implemented");
    // const event = await createEvent(credentials, emails, time);
    // return event;
}
