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

export const getFormattedDate = (utcOffset: number): string => {
    const date = new Date();
    date.setHours(date.getHours() + utcOffset);
    return dateToString(date);
};

export const offsetTime = (
    date: string,
    time: string,
    utcOffset: number
): string => {
    const [hour, minute, second] = time.split(":");
    const dateObj = new Date(`${date}T${hour}:${minute}:${second}Z`);
    dateObj.setHours(dateObj.getHours() - utcOffset);
    return dateObj.toISOString().slice(0, 19);
};

export function formatDateToYYYYMMDD(dateString: string): string {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    // Format to YYYY-MM-DD
    return `${year}-${month}-${day}`;
}
