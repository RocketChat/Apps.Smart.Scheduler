import { PREFERABLE_TIME_NODE } from "../constants/keys";
import { ICommonTimeString, ICommonTimeUnix } from "../definitions/ICommonTime";
import { IPeopleSchedule } from "../definitions/IPeopleSchedule";
import { ITreeNode } from "../definitions/ITreeNode";

export function convertDateTimeToUnix(dateTime: string): number {
    return new Date(dateTime).getTime();
}

export function convertUnixToDateTime(unix: number): string {
    return new Date(unix).toISOString();
}

export class CommonTimeExtractor {
    private peopleSchedule: IPeopleSchedule = {};
    private preferableTimeUnix: [number, number] = [0, 0];
    private results: ICommonTimeUnix[];

    constructor(private input: string) {
        this.input = input;
        this.extract();
    }

    public extract(): void {
        this.results = [];
        this.extractSchedule();

        const root: ITreeNode = {
            name: PREFERABLE_TIME_NODE,
            overlappedTime: this.preferableTimeUnix,
            children: [],
        };
        this.growSearchTree(root, 0);
        this.getParticipantAndTime(root, { participants: [], time: [0, 0] });
    }

    public getResultInUnix(): ICommonTimeUnix[] {
        return this.results;
    }

    public getResultInDateTime(): ICommonTimeString[] {
        return this.results.map((result) => {
            return {
                participants: result.participants,
                time: [
                    convertUnixToDateTime(result.time[0]),
                    convertUnixToDateTime(result.time[1]),
                ],
            };
        });
    }

    private extractSchedule(): void {
        let splitted = this.input.split("\n\n");

        let preferableTime = splitted[0].split("\n")[1];
        const [from, to] = preferableTime.split(" from ")[1].split(" to ");
        this.preferableTimeUnix = [
            convertDateTimeToUnix(from),
            convertDateTimeToUnix(to),
        ];

        let split: string;
        for (split of splitted.slice(1, splitted.length)) {
            const rows = split.split("\n");
            const name = rows.shift() as string;
            this.peopleSchedule[name] = {
                busy: [],
                officeHours: [0, 0],
                free: [],
            };

            let row: string;
            for (row of rows) {
                if (row.includes("Busy")) {
                    const [from, to] = row.split(" from ")[1].split(" to ");
                    this.peopleSchedule[name].busy.push([
                        convertDateTimeToUnix(from),
                        convertDateTimeToUnix(to),
                    ]);
                }
                if (row.includes("Office")) {
                    const [from, to] = row.split(" from ")[1].split(" to ");
                    this.peopleSchedule[name].officeHours = [
                        convertDateTimeToUnix(from),
                        convertDateTimeToUnix(to),
                    ];
                }
            }

            this.peopleSchedule[name].free = this.convertBusyToFree(
                this.peopleSchedule[name].busy,
                this.peopleSchedule[name].officeHours
            );
        }
    }

    private convertBusyToFree(
        busy: [number, number][],
        officeHours: [number, number]
    ): [number, number][] {
        const free: [number, number][] = [];

        let i = 0;
        let from = officeHours[0];
        let to = officeHours[1];
        for (const [busyFrom, busyTo] of busy) {
            if (busyFrom > from) {
                free.push([from, busyFrom]);
            }
            from = busyTo;
        }

        if (from < to) {
            free.push([from, to]);
        }

        return free;
    }

    private overlappedTime(
        time1: [number, number],
        time2: [number, number]
    ): [number, number] | null {
        const [from1, to1] = time1;
        const [from2, to2] = time2;

        if (from1 >= to2 || from2 >= to1) {
            return null;
        }

        return [Math.max(from1, from2), Math.min(to1, to2)];
    }

    private growSearchTree(parent: ITreeNode, currentPersonIndex: number) {
        if (currentPersonIndex >= Object.keys(this.peopleSchedule).length) {
            return;
        }

        const currentPerson = Object.keys(this.peopleSchedule)[
            currentPersonIndex
        ];
        const currentPersonSchedule = this.peopleSchedule[currentPerson];

        for (const freeTime of currentPersonSchedule.free) {
            const overlapped = this.overlappedTime(
                parent.overlappedTime,
                freeTime
            );
            if (overlapped) {
                const child = {
                    name: currentPerson,
                    overlappedTime: overlapped,
                    children: [],
                };
                parent.children.push(child);
                this.growSearchTree(child, currentPersonIndex + 1);
            }

            if (parent.overlappedTime[1] <= freeTime[0]) {
                break;
            }
        }

        if (parent.children.length === 0) {
            this.growSearchTree(parent, currentPersonIndex + 1);
        }
    }

    private getParticipantAndTime(
        node: ITreeNode,
        fromParents: ICommonTimeUnix
    ): void {
        let participants: string[] = [];
        if (node.name !== PREFERABLE_TIME_NODE) {
            participants = [...fromParents.participants, node.name];
        }

        const time = node.overlappedTime;

        if (node.children.length === 0) {
            this.results.push({ participants, time });
        }

        for (const child of node.children) {
            this.getParticipantAndTime(child, { participants, time });
        }
    }
}