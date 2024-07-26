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
        throw new Error("Error while checking availability");
    }

    return JSON.parse(response.content || "{}");
}
