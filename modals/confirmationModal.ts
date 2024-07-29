import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { UIKitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionContext";
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";
import {
    getInteractionRoomData,
    storeInteractionRoomData,
} from "../lib/roomInteraction";

export async function confirmationModal({
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
        blockId: "confirmationBlockId",
        text: blocks.newMarkdownTextObject(
            `*Please confirm the following details:*`
        ),
    });

    blocks.addActionsBlock({
        elements: [
            blocks.newButtonElement({
                actionId: "retry",
                text: blocks.newPlainTextObject("Retry"),
                value: "retry",
            }),
            blocks.newButtonElement({
                actionId: "setMeeting",
                text: blocks.newPlainTextObject("Set Meeting"),
                value: "setMeeting",
            }),
        ],
    });

    return {
        id: "confirmationModalId",
        title: blocks.newPlainTextObject("Schedule your meeting"),
        blocks: blocks.getBlocks(),
    };
}
