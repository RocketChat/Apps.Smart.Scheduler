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

interface IParticipantOption {
    text: {
        type: TextObjectType;
        text: string;
    };
    value: string;
}

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

    let participantOptions: IParticipantOption[] = [];
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

        const members = await read.getRoomReader().getMembers(roomId);
        participantOptions = members
            .sort((a, b) => {
                return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1;
            })
            .map((member) => {
                return {
                    text: {
                        type: TextObjectType.PLAINTEXT,
                        text: member.username,
                    },
                    value: member.username,
                };
            });
    }

    const blocks = modify.getCreator().getBlockBuilder();

    blocks.addSectionBlock({
        blockId: "guideBlockId",
        text: blocks.newMarkdownTextObject(
            `
            **In your prompt, you have to include:**
            1. The preferred day (today, tomorrow, next Monday, etc.). If you already know the exact date, you can put that as well.
            2. The preferred time (early morning, late afternoon, etc.).

            **Example:**
            Schedule a brainstorming session for next Tuesday. We need to discuss the new project timeline. Late morning is preferable.
            `
        ),
    });

    blocks.addInputBlock({
        blockId: "promptBlockId",
        label: {
            text: "Prompt:",
            type: TextObjectType.PLAINTEXT,
        },
        element: blocks.newPlainTextInputElement({
            actionId: "promptBlockId",
            placeholder: {
                text: "Let's do a strategy alignment call next Thursday. Early afternoon is preferable.",
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    blocks.addInputBlock({
        blockId: "participantsBlockId",
        label: {
            type: TextObjectType.PLAINTEXT,
            text: "Participants:",
            emoji: true,
        },
        element: blocks.newMultiStaticElement({
            actionId: "participantsBlockId",
            placeholder: {
                type: TextObjectType.PLAINTEXT,
                text: "Select 1 or more participants",
            },
            options: participantOptions,
        }),
    });

    return {
        id: "promptModalId",
        title: blocks.newPlainTextObject("Schedule your meeting"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Schedule"),
        }),
        blocks: blocks.getBlocks(),
    };
}
