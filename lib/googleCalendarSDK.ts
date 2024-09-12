import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";

export async function checkAvailability(
    accessToken: string,
    http: IHttp,
    emails: string[],
    timeMin: string,
    timeMax: string
): Promise<object> {
    const body = {
        timeMin,
        timeMax,
        items: emails.map((email) => ({ id: email })),
    };

    const response = await http.post(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            content: JSON.stringify(body),
        }
    );

    if (!response || response.statusCode !== 200) {
        throw new Error(
            "Make sure you authorize the app through `/schedule authorize` first"
        );
    }

    return JSON.parse(response.content || "{}");
}

export async function createEvent(
    accessToken: string,
    http: IHttp,
    emails: string[],
    timeStart: string,
    timeEnd: string,
    meetingSummary: string
): Promise<object> {
    const body = {
        summary: meetingSummary,
        attendees: emails.map((email) => ({ email })),
        start: {
            dateTime: timeStart.replace(".000Z", "+00:00"),
            timeZone: "UTC",
        },
        end: {
            dateTime: timeEnd.replace(".000Z", "+00:00"),
            timeZone: "UTC",
        },
    };

    const response = await http.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            content: JSON.stringify(body),
        }
    );

    if (!response || response.statusCode !== 200) {
        throw new Error(
            "There was an error while creating the event. Response: " +
                JSON.stringify(response)
        );
    }

    return JSON.parse(response.content || "{}");
}
