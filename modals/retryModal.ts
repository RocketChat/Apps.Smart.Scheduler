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
import { ModalEnum } from "../constants/enums";
import { ROOM_ID_KEY } from "../constants/keys";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { getData, storeData } from "../lib/dataStore";

export async function retryModal({
    modify,
    read,
    persistence,
    http,
    preferredArgs,
    slashCommandContext,
    uiKitContext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    preferredArgs: IConstraintArgs;
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

    blocks.addSectionBlock({
        blockId: "guideBlockId",
        text: blocks.newMarkdownTextObject(
            `
            Here's your current preference:
            - **Preferred date**: ${preferredArgs.preferredDate}
            - **Preferred time**: ${preferredArgs.timeMin} - ${preferredArgs.timeMax}

            If you want to change your preferred, please update the fields below. 
            Otherwise, leave them as is and click the "Schedule" button.
            `
        ),
    });

    blocks.addInputBlock({
        blockId: "preferredDateBlockId",
        label: {
            text: "Preferred date:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferredDateBlockId",
            placeholder: {
                text: `${preferredArgs.preferredDate}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "preferredTimeMinBlockId",
        label: {
            text: "Preferred start time:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferredTimeMinBlockId",
            placeholder: {
                text: `${preferredArgs.timeMin}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "preferredTimeMaxBlockId",
        label: {
            text: "Preferred end time:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferredTimeMaxBlockId",
            placeholder: {
                text: `${preferredArgs.timeMax}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    return {
        id: ModalEnum.RETRY_MODAL,
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Schedule"),
        }),
        blocks: blocks.getBlocks(),
    };
}
