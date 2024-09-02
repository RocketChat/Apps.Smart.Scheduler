const input = `General Constraint
- Preferable from 2024-09-02T01:00:00Z to 2024-09-02T04:00:00Z

Me
- Busy from 2024-09-02T02:00:00Z to 2024-09-02T02:30:00Z
- Busy from 2024-09-02T03:30:00Z to 2024-09-02T04:00:00Z
- Office hours from 2024-09-02T01:00:00Z to 2024-09-02T09:00:00Z

Theo
- Busy from 2024-09-02T01:30:00Z to 2024-09-02T02:00:00Z
- Busy from 2024-09-02T02:30:00Z to 2024-09-02T03:30:00Z
- Busy from 2024-09-02T04:00:00Z to 2024-09-02T04:30:00Z
- Office hours from 2024-09-02T01:00:00Z to 2024-09-02T09:00:00Z

Claire
- Busy from 2024-09-02T04:00:00Z to 2024-09-02T04:30:00Z
- Busy from 2024-09-02T05:00:00Z to 2024-09-02T05:30:00Z
- Office hours from 2024-09-02T01:00:00Z to 2024-09-02T12:00:00Z
`;

function convertDateTimeToUnix(dateTime: string): number {
    return new Date(dateTime).getTime();
}

function convertUnixToDateTime(unix: number): string {
    return new Date(unix).toISOString();
}

function convertBusyToFree(
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

let peopleSchedule = {};
let splitted = input.split("\n\n");

let preferableTime = splitted[0].split("\n")[1];
const [from, to] = preferableTime.split(" from ")[1].split(" to ");
const preferableTimeUnix = [
    convertDateTimeToUnix(from),
    convertDateTimeToUnix(to),
];

let split: string;
for (split of splitted.slice(1, splitted.length)) {
    const rows = split.split("\n");
    const name = rows.shift() as string;
    peopleSchedule[name] = { busy: [], officeHours: [] };

    let row;
    for (row of rows) {
        if (row.includes("Busy")) {
            const [from, to] = row.split(" from ")[1].split(" to ");
            peopleSchedule[name].busy.push([
                convertDateTimeToUnix(from),
                convertDateTimeToUnix(to),
            ]);
        }
        if (row.includes("Office hours")) {
            const [from, to] = row.split(" from ")[1].split(" to ");
            peopleSchedule[name].officeHours = [
                convertDateTimeToUnix(from),
                convertDateTimeToUnix(to),
            ];
        }
    }

    peopleSchedule[name].free = convertBusyToFree(
        peopleSchedule[name].busy,
        peopleSchedule[name].officeHours
    );

    // for (const [from, to] of peopleSchedule[name].free) {
    //     console.log(convertUnixToDateTime(from), convertUnixToDateTime(to));
    // }
    // console.log(name, peopleSchedule[name].free);
}

function overlappedTime(
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

interface TreeNode {
    name: string;
    overlappedTime: [number, number];
    children: TreeNode[];
}

function makeChildren(parent: TreeNode, currentPersonIndex: number) {
    if (currentPersonIndex >= Object.keys(peopleSchedule).length) {
        return;
    }

    const currentPerson = Object.keys(peopleSchedule)[currentPersonIndex];
    const currentPersonSchedule = peopleSchedule[currentPerson];

    for (const freeTime of currentPersonSchedule.free) {
        const overlapped = overlappedTime(parent.overlappedTime, freeTime);
        if (overlapped) {
            const child = {
                name: currentPerson,
                overlappedTime: overlapped,
                children: [],
            };
            parent.children.push(child);
            makeChildren(child, currentPersonIndex + 1);
        }

        if (parent.overlappedTime[1] <= freeTime[0]) {
            break;
        }
    }

    if (parent.children.length === 0) {
        makeChildren(parent, currentPersonIndex + 1);
    }
}

let overlapped = [];
const root: TreeNode = {
    name: "preferableTime",
    overlappedTime: [preferableTimeUnix[0], preferableTimeUnix[1]],
    children: [],
};

makeChildren(root, 0); // TODO: get possible time from overlapped

// ================================
function drawTree(node: TreeNode, depth: number) {
    console.log(
        "  ".repeat(depth) +
            node.name +
            " " +
            convertUnixToDateTime(node.overlappedTime[0]) +
            " " +
            convertUnixToDateTime(node.overlappedTime[1])
    );

    for (const child of node.children) {
        drawTree(child, depth + 1);
    }
}

drawTree(root, 0);
