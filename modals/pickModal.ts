import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { UIKitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionContext";
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";
import { ModalEnum } from "../constants/enums";
import { ROOM_ID_KEY } from "../constants/keys";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { getData, storeData } from "../lib/dataStore";

export async function retryModal({
    modify,
    read,
    persistence,
    http,
    preferenceArgs,
    slashCommandContext,
    uiKitContext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    preferenceArgs: IConstraintArgs;
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
            await storeData(persistence, user.id, ROOM_ID_KEY, { roomId });
        } else {
            roomId = (
                await getData(read.getPersistenceReader(), user.id, ROOM_ID_KEY)
            ).roomId;
        }
    }

    const blocks = modify.getCreator().getBlockBuilder();

    return {
        id: ModalEnum.PICK_MODAL,
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Schedule"),
        }),
        blocks: blocks.getBlocks(),
    };
}
