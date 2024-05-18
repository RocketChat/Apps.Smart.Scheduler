import { IModify } from "@rocket.chat/apps-engine/definition/accessors";
import { BlockElementType } from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitContextualBarViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";

export async function dummyModal(
    modify: IModify,
    viewId?: string
): Promise<IUIKitContextualBarViewParam> {
    // This method creates the blocks that will be rendered inside the contextual bar.

    const blocks = modify.getCreator().getBlockBuilder();
    const date = new Date().toISOString();

    // [4] - a message that presents the current date-time.
    blocks.addSectionBlock({
        text: blocks.newMarkdownTextObject(`The current date-time is\n${date}`),
        accessory: {
            // [5] - a button that updates the date-time shown in the message.
            type: BlockElementType.BUTTON,
            actionId: "date",
            text: blocks.newPlainTextObject("Refresh"),
            value: date,
        },
    });

    return {
        // [6] - the contextual bar structure containing its title and a submit button.
        id: viewId || "contextualbarId",
        title: blocks.newPlainTextObject("Contextual Bar"),
        submit: blocks.newButtonElement({
            text: blocks.newPlainTextObject("Submit"),
        }),
        blocks: blocks.getBlocks(),
    };
}
