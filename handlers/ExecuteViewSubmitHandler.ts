import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { getFormattedDate } from "../lib/dateutil";
import { sendNotification } from "../lib/messages";
import { getInteractionRoomData } from "../lib/roomInteraction";

export class ExecuteViewSubmitHandler {
    constructor(
        private readonly app: SmartSchedulingApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(context: UIKitViewSubmitInteractionContext) {
        const { user, view } = context.getInteractionData();

        if (!user) {
            return {
                success: false,
                error: "No user found",
            };
        }

        const { roomId } = await getInteractionRoomData(
            this.read.getPersistenceReader(),
            user.id
        );

        if (!roomId) {
            return {
                success: false,
                error: "No room to send a message",
            };
        }

        // Get room details
        let room = (await this.read.getRoomReader().getById(roomId)) as IRoom;
        const members = await this.read.getRoomReader().getMembers(roomId);

        // Prompting
        const prompt = view.state?.["promptBlockId"]["promptBlockId"] || "";
        const processedPrompt = `Given today is ${getFormattedDate()}. ${prompt}`;
        try {
            // const preferredDateTime = await getPreferredDateTime(
            //     this.app,
            //     this.http,
            //     createPreferredDateTimePrompt(processedPrompt)
            // ).then((res) => res);

            // Send a notification to the room
            await sendNotification(
                this.read,
                this.modify,
                user,
                room,
                `Prompt: ${processedPrompt}
                Emails: ${members.map((member) => member.emails).join(", ")}
                `
                // \n Preferred datetime: ${JSON.stringify(preferredDateTime)}
            );

            return {
                success: true,
                roomId: roomId,
                members: members,
                // preferredDateTime,
                // ...view,
            };
        } catch (e) {
            await sendNotification(
                this.read,
                this.modify,
                user,
                room,
                `Error: ${e}`
            );
            return {
                success: false,
                error: e,
            };
        }
    }
}
