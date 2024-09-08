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

    blocks.addSectionBlock({
        blockId: "guideBlockId",
        text: blocks.newMarkdownTextObject(
            `
            Here's your current preference:
            - **Preferred date**: ${preferenceArgs.preferredDate}
            - **Preferred time**: ${preferenceArgs.timeMin} - ${preferenceArgs.timeMax}

            If you want to change your preference, please update the fields below. 
            Otherwise, leave them as is and click the "Schedule" button.
            `
        ),
    });

    blocks.addInputBlock({
        blockId: "preferenceDateBlockId",
        label: {
            text: "Preference date:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferenceDateBlockId",
            placeholder: {
                text: `${preferenceArgs.preferredDate}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "preferenceTimeMinBlockId",
        label: {
            text: "Preference start time:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferenceTimeMinBlockId",
            placeholder: {
                text: `${preferenceArgs.timeMin}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "preferenceTimeMaxBlockId",
        label: {
            text: "Preference end time:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "preferenceTimeMaxBlockId",
            placeholder: {
                text: `${preferenceArgs.timeMax}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    // blocks.addDividerBlock();

    // blocks.addInputBlock({
    //     blockId: "algorithmBlockId",
    //     label: {
    //         text: "Execute with:",
    //         type: TextObjectType.PLAINTEXT,
    //     },
    //     element: blocks.newStaticSelectElement({
    //         actionId: "algorithmBlockId",
    //         placeholder: {
    //             text: "Select algorithm",
    //             type: TextObjectType.PLAINTEXT,
    //         },
    //         options: [
    //             {
    //                 text: {
    //                     type: TextObjectType.PLAINTEXT,
    //                     text: "algorithm",
    //                 },
    //                 value: "algorithm",
    //             },
    //             {
    //                 text: {
    //                     type: TextObjectType.PLAINTEXT,
    //                     text: "llm",
    //                 },
    //                 value: "llm",
    //             },
    //         ],
    //     }),
    // });

    return {
        id: ModalEnum.RETRY_MODAL,
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Schedule"),
        }),
        blocks: blocks.getBlocks(),
    };
}
