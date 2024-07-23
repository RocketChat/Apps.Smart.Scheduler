const dateToString = (date: Date, isDay: boolean = true): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const dayOfMonth = date.getDate().toString().padStart(2, "0");

    if (isDay) {
        const daysOfWeek = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ];
        const dayOfWeek = daysOfWeek[date.getDay()];
        return `${dayOfWeek}, ${year}-${month}-${dayOfMonth}`;
    } else {
        return `${year}-${month}-${dayOfMonth}`;
    }
};

export const getFormattedDate = (): string => {
    // TODO: add timezone
    const date = new Date();
    return dateToString(date);
};

export const getDateWithOffsetDays = (offsetDays: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return dateToString(date);
};
