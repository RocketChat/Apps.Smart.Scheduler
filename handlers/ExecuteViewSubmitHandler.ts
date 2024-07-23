import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { getPreferredDate, getPreferredTime } from "../core/llms";
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
        const preferredDate = await getPreferredDate(
            this.app,
            this.http,
            processedPrompt
        ).then((res) => res);
        const preferredTime = await getPreferredTime(
            this.app,
            this.http,
            processedPrompt
        ).then((res) => res);

        // Send a notification to the room
        await sendNotification(
            this.read,
            this.modify,
            user,
            room,
            `Prompt: Given today is ${getFormattedDate()}. ${prompt}
            \n Preferred date: ${JSON.stringify(preferredDate)}
            \n Preferred time: ${JSON.stringify(preferredTime)}
            `
        );

        return {
            success: true,
            roomId: roomId,
            members: members,
            preferredDate,
            preferredTime,
            // ...view,
        };
    }
}
