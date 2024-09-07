export interface IPeopleSchedule {
    [name: string]: {
        busy: [number, number][];
        officeHours: [number, number];
        free: [number, number][];
    };
}
