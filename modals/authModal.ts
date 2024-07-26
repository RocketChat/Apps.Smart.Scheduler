import {
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { sendNotification } from "../lib/messages";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

export async function authorize(
    app: SmartSchedulingApp,
    read: IRead,
    modify: IModify,
    user: IUser,
    room: IRoom,
    persistence: IPersistence
): Promise<void> {
    const url = await app
        .getOauth2ClientInstance()
        .getUserAuthorizationUrl(user);

    const message = "Authorize Google Calendar";

    const blocks = modify.getCreator().getBlockBuilder();

    blocks.addActionsBlock({
        elements: [
            blocks.newButtonElement({
                actionId: "authorize",
                text: blocks.newPlainTextObject("Authorize Google Calendar"),
                url: url.toString(),
            }),
        ],
    });

    await sendNotification(read, modify, user, room, message, blocks);
}
