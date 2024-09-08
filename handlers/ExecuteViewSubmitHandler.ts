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
    generateConstraintPrompt,
    generatePromptForAlgorithm,
    getRecommendedTime,
} from "../core/llms";
// import { generateChatCompletions } from "../core/llms";
import {
    PARTICIPANT_KEY,
    PREFFERED_ARGS_KEY,
    PROMPT_KEY,
    RETRY_COUNT_KEY,
    ROOM_ID_KEY,
} from "../constants/keys";
import { CommonTimeExtractor } from "../core/algorithm";
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
                        prompt,
                        this.persistence,
                        this.read,
                        this.modify,
                        room
                    )
                        .then((res) => {
                            generatePromptForAlgorithm(
                                this.app,
                                this.http,
                                user,
                                participants,
                                res
                            ).then((res) => {
                                const extractor = new CommonTimeExtractor(res);
                                extractor.extract();

                                sendNotification(
                                    this.read,
                                    this.modify,
                                    user,
                                    room,
                                    `Common time: ${JSON.stringify(
                                        extractor.getResultInDateTime()
                                    )}`
                                );

                                getRecommendedTime(
                                    this.app,
                                    this.http,
                                    prompt,
                                    extractor.getResultInDateTime()
                                ).then((res) => {
                                    sendNotification(
                                        this.read,
                                        this.modify,
                                        user,
                                        room,
                                        `Recommended time prompt: ${JSON.stringify(
                                            res
                                        )}`
                                    );
                                });
                            });
                        })
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

                    // TODO: retrigger algorithm
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
