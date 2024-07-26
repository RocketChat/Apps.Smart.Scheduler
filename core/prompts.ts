import { ASK_PREFERRED_DATETIME } from "../constants/prompts";

export function createPreferredDateTimePrompt(prompt: string): string {
    const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        return `- ${date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        })}`;
    }).join("\n");

    return ASK_PREFERRED_DATETIME.replace("{prompt}", prompt).replace(
        "{days}",
        days
    );
}
