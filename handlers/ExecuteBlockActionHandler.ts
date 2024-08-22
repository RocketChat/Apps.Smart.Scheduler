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
} from "../constants/keys";
import {
    generateCommonTime,
    generateConstraintPrompt,
    getMeetingArguments,
} from "../core/llms";
import { getData, storeData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";
import { confirmationModal } from "../modals/confirmationModal";
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
                    // if (!prompt || !participants) {
                    //     sendNotification(
                    //         this.read,
                    //         this.modify,
                    //         user,
                    //         room,
                    //         "Input should not be empty"
                    //     );
                    // }

                    generateConstraintPrompt(
                        this.app,
                        this.http,
                        user,
                        participants,
                        prompt,
                        this.read,
                        this.modify,
                        room
                    )
                        .then((res) => {
                            sendNotification(
                                this.read,
                                this.modify,
                                user,
                                room,
                                `> Constraint prompt: ${res}`
                            );

                            return generateCommonTime(
                                this.app,
                                this.http,
                                res
                            ).then((res) => {
                                sendNotification(
                                    this.read,
                                    this.modify,
                                    user,
                                    room,
                                    `> Common time: ${res}`
                                );
                                return getMeetingArguments(
                                    this.app,
                                    this.http,
                                    res,
                                    user,
                                    this.read,
                                    this.modify,
                                    room
                                ).then((res) => {
                                    const blocks = confirmationModal({
                                        modify: this.modify,
                                        read: this.read,
                                        persistence: this.persistence,
                                        http: this.http,
                                        uiKitContext: context,
                                        summary: `Participants: ${participants}
                                        Args: 
                                        - Start time: ${res.datetimeStart}
                                        - End time: ${res.datetimeEnd}
                                        `,
                                    });

                                    sendNotification(
                                        this.read,
                                        this.modify,
                                        user,
                                        room,
                                        `Schedule your meeting`,
                                        blocks
                                    );

                                    return res;
                                });
                            });
                        })
                        .catch((e) => this.app.getLogger().error(e));

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
