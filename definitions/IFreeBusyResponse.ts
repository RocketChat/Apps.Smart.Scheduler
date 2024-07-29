export interface IFreeBusyResponse {
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
