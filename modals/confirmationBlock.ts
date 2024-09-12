import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    BlockBuilder,
    ButtonStyle,
    IButtonElement,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UIKitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionContext";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { offsetTime } from "../lib/dateUtils";

export function confirmationBlock({
    modify,
    read,
    persistence,
    http,
    summary,
    slashCommandContext,
    uiKitContext,
    userOffset = 7,
    useRetry = false,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    summary: IMeetingArgs;
    slashCommandContext?: SlashCommandContext;
    uiKitContext?: UIKitInteractionContext;
    userOffset?: number;
    useRetry?: boolean;
}): BlockBuilder {
    // Preprocess information
    summary.datetimeStart = offsetTime(
        summary.datetimeStart.split("T")[0],
        summary.datetimeStart.split("T")[1].replace("Z", ""),
        -userOffset
    );
    summary.datetimeEnd = offsetTime(
        summary.datetimeEnd.split("T")[0],
        summary.datetimeEnd.split("T")[1].replace("Z", ""),
        -userOffset
    );

    const blocks = modify.getCreator().getBlockBuilder();
    blocks.addSectionBlock({
        blockId: "confirmationBlockId",
        text: blocks.newMarkdownTextObject(
            `*Please confirm the following details:*
            1. Topic: ${summary.meetingSummary}
            2. Participants: 
                ${summary.participants
                    .map((participant) => `     - ${participant}`)
                    .join("\n")}
            3. Datetime start: ${summary.datetimeStart}
            4. Datetime end: ${summary.datetimeEnd} 
            Use \`/schedule retry\` to regenerate the recommended, 
            or \`/schedule pick\` to select it yourself.
            `
        ),
    });

    let createdElements: IButtonElement[] = [];

    if (useRetry) {
        createdElements.push(
            blocks.newButtonElement({
                text: blocks.newPlainTextObject("Retry"),
                actionId: "Retry",
            })
        );
    }

    createdElements.push(
        blocks.newButtonElement({
            actionId: "Schedule",
            text: blocks.newPlainTextObject("Schedule"),
            style: ButtonStyle.PRIMARY,
        })
    );

    blocks.addActionsBlock({
        blockId: "confirmationActionsBlockId",
        elements: createdElements,
    });

    return blocks;
}
