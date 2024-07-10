import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { UIKitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionContext";
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";
import { TextObjectType } from "@rocket.chat/apps-engine/definition/uikit/blocks";
import {
    getInteractionRoomData,
    storeInteractionRoomData,
} from "../lib/roomInteraction";

export async function promptModal({
    modify,
    read,
    persistence,
    http,
    slashCommandContext,
    uiKitContext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    slashCommandContext?: SlashCommandContext;
    uiKitContext?: UIKitInteractionContext;
}): Promise<IUIKitModalViewParam> {
    const room =
        slashCommandContext?.getRoom() ||
        uiKitContext?.getInteractionData().room;
    const user =
        slashCommandContext?.getSender() ||
        uiKitContext?.getInteractionData().user;

    if (user?.id) {
        let roomId: string;

        if (room?.id) {
            roomId = room.id;
            await storeInteractionRoomData(persistence, user.id, roomId);
        } else {
            roomId = (
                await getInteractionRoomData(
                    read.getPersistenceReader(),
                    user.id
                )
            ).roomId;
        }
    }

    const blocks = modify.getCreator().getBlockBuilder();

    blocks.addSectionBlock({
        blockId: "guideBlockId",
        text: blocks.newMarkdownTextObject(
            `
            You have to follow *this* guide. Here's an example: 
            lalala
            `
        ),
    });

    blocks.addInputBlock({
        blockId: "promptBlockId",
        label: {
            text: "Enter the prompt",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "promptBlockId",
            placeholder: {
                text: "Enter the prompt",
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    return {
        id: "promptModalId",
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Submit"),
        }),
        blocks: blocks.getBlocks(),
    };
}
