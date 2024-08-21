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
} from "@rocket.chat/apps-engine/definition/uikit";
import { UIKitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionContext";

export function confirmationModal({
    modify,
    read,
    persistence,
    http,
    summary,
    slashCommandContext,
    uiKitContext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    summary: string;
    slashCommandContext?: SlashCommandContext;
    uiKitContext?: UIKitInteractionContext;
}): BlockBuilder {
    const blocks = modify.getCreator().getBlockBuilder();
    blocks.addSectionBlock({
        blockId: "confirmationBlockId",
        text: blocks.newMarkdownTextObject(
            `*Please confirm the following details:*
            ${summary}`
        ),
    });

    blocks.addActionsBlock({
        blockId: "confirmationActionsBlockId",
        elements: [
            blocks.newButtonElement({
                actionId: "Retry",
                text: blocks.newPlainTextObject("Not satisfied? Retry here"),
            }),
            blocks.newButtonElement({
                actionId: "Schedule",
                text: blocks.newPlainTextObject("Schedule"),
                style: ButtonStyle.PRIMARY,
            }),
        ],
    });

    return blocks;
}
