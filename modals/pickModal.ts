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
import { ICommonTimeString } from "../definitions/ICommonTime";
import { getData, storeData } from "../lib/dataStore";

export async function pickModal({
    modify,
    read,
    persistence,
    http,
    preferredDate,
    availableTimes,
    meetingSummary,
    slashCommandContext,
    uiKitContext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    preferredDate: string;
    availableTimes: ICommonTimeString[];
    meetingSummary: string;
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
        text: blocks.newMarkdownTextObject(
            `Assuming all participants should join, what time would you like to schedule the meeting?`
        ),
    });

    blocks.addInputBlock({
        blockId: "meetingSummaryBlockId",
        label: {
            text: "Meeting topic:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "meetingSummaryBlockId",
            placeholder: {
                text: `${meetingSummary}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
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
                text: `${preferredDate}`,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "preferredTimeBlockId",
        label: {
            text: "Preferred time:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newStaticSelectElement({
            actionId: "preferredTimeBlockId",
            placeholder: {
                text: "Select a time",
                type: TextObjectType.PLAINTEXT,
            },
            options: availableTimes.map((commonTime) => ({
                text: {
                    text: `${commonTime.time[0]
                        .split("T")[1]
                        .replace(".000Z", "")}`,
                    type: TextObjectType.PLAINTEXT,
                },
                value: commonTime.time[0].split("T")[1].replace(".000Z", ""),
            })),
        }),
    });

    const durationOptions = [15, 30, 45, 60, 90, 120];
    blocks.addInputBlock({
        blockId: "preferredDurationBlockId",
        label: {
            text: "Preferred duration:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newStaticSelectElement({
            actionId: "preferredDurationBlockId",
            placeholder: {
                text: "Select a duration",
                type: TextObjectType.PLAINTEXT,
            },
            options: durationOptions.map((duration) => ({
                text: {
                    text: `${duration} minutes`,
                    type: TextObjectType.PLAINTEXT,
                },
                value: duration.toString(),
            })),
        }),
    });

    return {
        id: ModalEnum.PICK_MODAL,
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Schedule"),
        }),
        blocks: blocks.getBlocks(),
    };
}
