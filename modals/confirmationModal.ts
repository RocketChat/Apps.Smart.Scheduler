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

export function confirmationModal({
    modify,
    read,
    persistence,
    http,
    summary,
    slashCommandContext,
    uiKitContext,
    useRetry = true,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    summary: string;
    slashCommandContext?: SlashCommandContext;
    uiKitContext?: UIKitInteractionContext;
    useRetry?: boolean;
}): BlockBuilder {
    const blocks = modify.getCreator().getBlockBuilder();
    blocks.addSectionBlock({
        blockId: "confirmationBlockId",
        text: blocks.newMarkdownTextObject(
            `*Please confirm the following details:*
            ${summary}`
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
