import { IHttp } from "@rocket.chat/apps-engine/definition/accessors";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IFreeBusyResponse } from "../definitions/IFreeBusyResponse";
import { formatDateToYYYYMMDD, offsetTime } from "../lib/dateUtils";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { getFreeBusySchedule } from "./googleCalendar";
import { constructSchedule } from "./prompts";

export const functionsMap = {
    getPeopleSchedule: async ({
        app,
        http,
        user,
        usernames,
        date,
        roomMembers,
    }: {
        app: SmartSchedulingApp;
        http: IHttp;
        user: IUser;
        usernames: string[];
        date: string;
        roomMembers: IUser[];
    }): Promise<string> => {
        const people = usernames.map((username) => {
            const person = roomMembers.find(
                (member) => member.username === username.replace("@", "")
            );
            return person
                ? { email: person.emails[0].address, offset: person.utcOffset }
                : null;
        });

        const validPeople = people.filter((person) => person !== null) as {
            email: string;
            offset: number;
        }[];

        const emails = validPeople.map((person) => person.email);
        const offsets = validPeople.map((person) => person.offset);
        const modifiedDate = formatDateToYYYYMMDD(date);

        let constraints = (await getFreeBusySchedule(
            app,
            http,
            user,
            emails,
            modifiedDate
        ).then((res) => res)) as IFreeBusyResponse;

        for (const calendar in constraints.calendars) {
            const busy = constraints.calendars[calendar].busy;
            constraints.calendars[calendar].busy = busy.map((time) => {
                return {
                    start: offsetTime(
                        time.start.split("T")[0],
                        time.start.split("T")[1].replace("Z", ""),
                        -user.utcOffset
                    ),
                    end: offsetTime(
                        time.end.split("T")[0],
                        time.end.split("T")[1].replace("Z", ""),
                        -user.utcOffset
                    ),
                };
            });
        }

        const prompt = constructSchedule(
            modifiedDate,
            constraints,
            offsets,
            usernames,
            false
        );
        return `Here is the schedule for ${date} in your local time: ${prompt}`;
    },
};
