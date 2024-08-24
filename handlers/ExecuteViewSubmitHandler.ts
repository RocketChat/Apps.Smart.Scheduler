import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { ModalEnum } from "../constants/enums";
import {
    generateCommonTime,
    generateConstraintPrompt,
    generateConstraintPromptHelper,
    getMeetingArguments,
} from "../core/llms";
import { confirmationModal } from "../modals/confirmationModal";
// import { generateChatCompletions } from "../core/llms";
import {
    PARTICIPANT_KEY,
    PREFFERED_ARGS_KEY,
    PROMPT_KEY,
    RETRY_COUNT_KEY,
    ROOM_ID_KEY,
} from "../constants/keys";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { getData, storeData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";

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

        const { roomId } = await getData(
            this.read.getPersistenceReader(),
            user.id,
            ROOM_ID_KEY
        );

        if (!roomId) {
            return {
                success: false,
                error: "No room to send a message",
            };
        }

        let room = (await this.read.getRoomReader().getById(roomId)) as IRoom;
        const readPersistence = this.read.getPersistenceReader();

        try {
            switch (view.id) {
                case ModalEnum.CONFIRMATION_MODAL: {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        "> **Meeting scheduled**"
                    );
                    break;
                }
                case ModalEnum.PROMPT_MODAL: {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        `AI is thinking, it may take a while. Please wait... :clock12:`
                    );

                    const prompt =
                        view.state?.["promptBlockId"]["promptBlockId"] || "";
                    const participants =
                        view.state?.["participantsBlockId"][
                            "participantsBlockId"
                        ] || "";

                    await storeData(this.persistence, user.id, PROMPT_KEY, {
                        prompt,
                    });

                    await storeData(
                        this.persistence,
                        user.id,
                        PARTICIPANT_KEY,
                        { participants }
                    );

                    await storeData(
                        this.persistence,
                        user.id,
                        RETRY_COUNT_KEY,
                        { count: 1 }
                    );

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

                    generateConstraintPrompt(
                        this.app,
                        this.http,
                        user,
                        participants,
                        prompt,
                        this.persistence,
                        this.read,
                        this.modify,
                        room
                    )
                        .then((res) =>
                            generateCommonTime(this.app, this.http, res).then(
                                (res) => {
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
                                            useRetry: false,
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
                                            "Schedule your meeting. Use `/schedule retry` if you are not satisfied.",
                                            blocks
                                        );

                                        return res;
                                    });
                                }
                            )
                        )
                        .catch((e) => this.app.getLogger().error(e));

                    break;
                }
                case ModalEnum.RETRY_MODAL: {
                    await sendNotification(
                        this.read,
                        this.modify,
                        user,
                        room,
                        `Retrying...`
                    );

                    const { prompt } = await getData(
                        readPersistence,
                        user.id,
                        PROMPT_KEY
                    );

                    if (!prompt) {
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            `Trigger \`\\schedule\` first`
                        );

                        return {
                            success: false,
                            error: "No prompt found",
                        };
                    }

                    const { participants } = await getData(
                        readPersistence,
                        user.id,
                        PARTICIPANT_KEY
                    );

                    const { count } = await getData(
                        readPersistence,
                        user.id,
                        RETRY_COUNT_KEY
                    );

                    await storeData(
                        this.persistence,
                        user.id,
                        RETRY_COUNT_KEY,
                        { count: count + 1 }
                    );

                    const args = await getData(
                        readPersistence,
                        user.id,
                        PREFFERED_ARGS_KEY
                    );

                    const newArgs: IConstraintArgs = {
                        preferredDate:
                            view.state?.["preferenceDateBlockId"][
                                "preferenceDateBlockId"
                            ] || args.preferredDate,
                        timeMin:
                            view.state?.["preferenceTimeMinBlockId"][
                                "preferenceTimeMinBlockId"
                            ] || args.timeMin,
                        timeMax:
                            view.state?.["preferenceTimeMaxBlockId"][
                                "preferenceTimeMaxBlockId"
                            ] || args.timeMax,
                    };

                    await storeData(
                        this.persistence,
                        user.id,
                        PREFFERED_ARGS_KEY,
                        newArgs
                    );

                    const algorithm =
                        view.state?.["algorithmBlockId"]["algorithmBlockId"] ||
                        "llm";

                    switch (algorithm) {
                        case "llm": {
                            generateConstraintPromptHelper(
                                this.app,
                                this.http,
                                user,
                                participants,
                                newArgs
                            )
                                .then((res) => {
                                    generateCommonTime(
                                        this.app,
                                        this.http,
                                        res
                                    ).then((res) => {
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
                                                useRetry: false,
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
                                                "Schedule your meeting",
                                                blocks
                                            );

                                            return res;
                                        });
                                    });
                                })
                                .catch((e) => this.app.getLogger().error(e));

                            break;
                        }
                        case "algorithm": {
                            // TODO
                            await sendNotification(
                                this.read,
                                this.modify,
                                user,
                                room,
                                "Algorithm is not implemented yet"
                            );

                            break;
                        }
                    }

                    break;
                }
            }

            return context.getInteractionResponder().successResponse();
        } catch (e) {
            await sendNotification(
                this.read,
                this.modify,
                user,
                room,
                `Error occurred: ${e}`
            );
            return context.getInteractionResponder().errorResponse();
        }
    }
}
