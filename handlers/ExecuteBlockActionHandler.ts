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
import {
    PARTICIPANT_KEY,
    PROMPT_KEY,
    RETRY_COUNT_KEY,
    ROOM_ID_KEY,
    SCHEDULE_ARGS_KEY,
} from "../constants/keys";
import { setMeeting } from "../core/googleCalendar";
import { getData, storeData } from "../lib/dataStore";
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
                const { participants, time } = await getData(
                    readPersistence,
                    user.id,
                    SCHEDULE_ARGS_KEY
                );

                // TODO: check response
                await setMeeting(
                    this.app,
                    this.http,
                    user,
                    participants,
                    time[0],
                    time[1]
                );

                await sendNotification(
                    this.read,
                    this.modify,
                    user,
                    room,
                    "Meeting is scheduled :white_check_mark: . Please check your calendar :calendar: "
                );

                return context.getInteractionResponder().successResponse();
            }
            case "Retry": {
                const { count } = await getData(
                    readPersistence,
                    user.id,
                    RETRY_COUNT_KEY
                );

                if (count >= 3) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        "You have reached the maximum number of retries. Trigger `/schedule` to start over."
                    );

                    return context.getInteractionResponder().successResponse();
                }

                const { prompt } = await getData(
                    readPersistence,
                    user.id,
                    PROMPT_KEY
                );
                const { participants } = await getData(
                    readPersistence,
                    user.id,
                    PARTICIPANT_KEY
                );

                await storeData(this.persistence, user.id, RETRY_COUNT_KEY, {
                    count: count + 1,
                });

                try {
                    // TODO: Validate user input: prompt injection, 0 participants, etc.
                    if (!prompt || !participants) {
                        sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Input should not be empty"
                        );
                    }

                    // TODO: Implement retry

                    sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        `Retry count: ${count}. Please wait... :clock12:`
                    );
                    return context.getInteractionResponder().successResponse();
                } catch (e) {
                    return context.getInteractionResponder().errorResponse();
                }
            }
        }

        return {
            success: true,
        };
    }
}
