import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import {
    generateCommonTime,
    generateConstraintPrompt,
    getMeetingArguments,
} from "../core/llms";
import { sendNotification } from "../lib/messages";
import { getInteractionRoomData } from "../lib/roomInteraction";
import { confirmationModal } from "../modals/confirmationModal";

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

        let room = (await this.read.getRoomReader().getById(roomId)) as IRoom;
        const members = await this.read.getRoomReader().getMembers(roomId);

        try {
            const prompt = view.state?.["promptBlockId"]["promptBlockId"] || "";
            const participants =
                view.state?.["participantsBlockId"]["participantsBlockId"] ||
                "";

            // TODO: Validate user input: prompt injection, 0 participants, etc.
            if (!prompt || !participants) {
                throw new Error("Input should not be empty");
            }

            const constraintPrompt = await generateConstraintPrompt(
                this.app,
                this.http,
                user,
                participants,
                prompt,
                this.read,
                this.modify,
                room
            );

            const commonTime = await generateCommonTime(
                this.app,
                this.http,
                constraintPrompt
            );

            const meetingArgs = await getMeetingArguments(
                this.app,
                this.http,
                commonTime
            );

            await sendNotification(
                this.read,
                this.modify,
                user,
                room,
                `Constraint prompt: ${constraintPrompt}
                -----------
                Common time: ${commonTime}
                -----------
                Meeting args: ${JSON.stringify(meetingArgs)}
                `
            );

            // TODO: Not working yet
            const triggerId = context.getInteractionData().triggerId;
            const confirmationBlocks = await confirmationModal({
                modify: this.modify,
                read: this.read,
                persistence: this.persistence,
                http: this.http,
                summary: JSON.stringify(meetingArgs),
            });

            await this.modify
                .getUiController()
                .updateModalView(confirmationBlocks, { triggerId }, user);

            return {
                success: true,
                roomId: roomId,
                members: members,
            };
        } catch (e) {
            await sendNotification(this.read, this.modify, user, room, `${e}`);
            return {
                success: false,
                error: e,
            };
        }
    }
}
