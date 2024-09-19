import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { MEETING_ARGS_KEY, ROOM_ID_KEY } from "../constants/keys";
import { setMeeting } from "../core/googleCalendar";
import { IMeetingArgs } from "../definitions/IMeetingArgs";
import { getData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

export class ExecuteBlockActionHandler {
    constructor(
        private readonly app: SmartSchedulingApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(
        context: UIKitBlockInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();
        const { user, actionId } = data;
        let room = data.room as IRoom;

        const readPersistence = this.read.getPersistenceReader();
        if (!room) {
            const { roomId } = await getData(
                readPersistence,
                user.id,
                ROOM_ID_KEY
            );
            room = (await this.read.getRoomReader().getById(roomId)) as IRoom;
        }

        switch (actionId) {
            case "Schedule": {
                const args: IMeetingArgs = await getData(
                    readPersistence,
                    user.id,
                    MEETING_ARGS_KEY
                );

                setMeeting(
                    this.app,
                    this.http,
                    user,
                    args.participants,
                    args.datetimeStart,
                    args.datetimeEnd,
                    args.meetingSummary
                ).then(() => {
                    sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        `Event is scheduled :white_check_mark: 
                        Please check your calendar :calendar: `
                    );
                });

                return context.getInteractionResponder().successResponse();
            }
            case "Retry": {
            }
        }

        return {
            success: true,
        };
    }
}
