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
    getMeetingArguments,
    getRecommendedTime,
} from "../core/llms";
// import { generateChatCompletions } from "../core/llms";
import {
    COMMON_TIMES_KEY,
    MEETING_ARGS_KEY,
    PARTICIPANT_KEY,
    PREFFERED_ARGS_KEY,
    PROMPT_KEY,
    RETRY_COUNT_KEY,
    ROOM_ID_KEY,
} from "../constants/keys";
import { CommonTimeExtractor } from "../core/algorithm";
import { setMeeting } from "../core/googleCalendar";
import { IConstraintArgs } from "../definitions/IConstraintArgs";
import { getData, storeData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";
import { confirmationBlock } from "../modals/confirmationBlock";

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
                case ModalEnum.PICK_MODAL: {
                    const args = await getData(
                        readPersistence,
                        user.id,
                        PREFFERED_ARGS_KEY
                    );

                    const { meetingSummary } = await getData(
                        readPersistence,
                        user.id,
                        MEETING_ARGS_KEY
                    );

                    const { participants } = await getData(
                        readPersistence,
                        user.id,
                        PARTICIPANT_KEY
                    );

                    const preferredDate =
                        view.state?.["preferredDateBlockId"][
                            "preferredDateBlockId"
                        ] || args.preferredDate;

                    const preferredTime =
                        view.state?.["preferredTimeBlockId"][
                            "preferredTimeBlockId"
                        ] || "";

                    const preferredDuration =
                        view.state?.["preferredDurationBlockId"][
                            "preferredDurationBlockId"
                        ] || 30;

                    if (!preferredTime) {
                        sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Please select a time"
                        );
                    }

                    const startTime = new Date(
                        `${preferredDate}T${preferredTime}Z`
                    );
                    const endTime = new Date(
                        startTime.getTime() + preferredDuration * 60000
                    );

                    setMeeting(
                        this.app,
                        this.http,
                        user,
                        participants,
                        startTime.toISOString(),
                        endTime.toISOString(),
                        meetingSummary
                    ).then(() => {
                        sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Meeting is scheduled :white_check_mark: . Please check your calendar :calendar: "
                        );
                    });

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

                    // TODO: Validate user input
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
                        this.persistence
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
                                storeData(
                                    this.persistence,
                                    user.id,
                                    COMMON_TIMES_KEY,
                                    extractor.getResultInDateTime()
                                );

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

                                    getMeetingArguments(
                                        this.app,
                                        this.http,
                                        res
                                    ).then((res) => {
                                        storeData(
                                            this.persistence,
                                            user.id,
                                            MEETING_ARGS_KEY,
                                            res
                                        );

                                        const blocks = confirmationBlock({
                                            modify: this.modify,
                                            read: this.read,
                                            persistence: this.persistence,
                                            http: this.http,
                                            summary: res,
                                        });

                                        sendNotification(
                                            this.read,
                                            this.modify,
                                            user,
                                            room,
                                            "Schedule the meeting",
                                            blocks
                                        );
                                    });
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

                    const { participants } = await getData(
                        readPersistence,
                        user.id,
                        PARTICIPANT_KEY
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

                    const args = await getData(
                        readPersistence,
                        user.id,
                        PREFFERED_ARGS_KEY
                    );

                    const newArgs: IConstraintArgs = {
                        preferredDate:
                            view.state?.["preferredDateBlockId"][
                                "preferredDateBlockId"
                            ] || args.preferredDate,
                        timeMin:
                            view.state?.["preferredTimeMinBlockId"][
                                "preferredTimeMinBlockId"
                            ] || args.timeMin,
                        timeMax:
                            view.state?.["preferredTimeMaxBlockId"][
                                "preferredTimeMaxBlockId"
                            ] || args.timeMax,
                    };

                    await storeData(
                        this.persistence,
                        user.id,
                        PREFFERED_ARGS_KEY,
                        newArgs
                    );

                    generatePromptForAlgorithm(
                        this.app,
                        this.http,
                        user,
                        participants,
                        newArgs
                    )
                        .then((res) => {
                            const extractor = new CommonTimeExtractor(res);
                            extractor.extract();
                            storeData(
                                this.persistence,
                                user.id,
                                COMMON_TIMES_KEY,
                                extractor.getResultInDateTime()
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

                                getMeetingArguments(
                                    this.app,
                                    this.http,
                                    res
                                ).then((res) => {
                                    storeData(
                                        this.persistence,
                                        user.id,
                                        MEETING_ARGS_KEY,
                                        res
                                    );

                                    const blocks = confirmationBlock({
                                        modify: this.modify,
                                        read: this.read,
                                        persistence: this.persistence,
                                        http: this.http,
                                        summary: res,
                                    });

                                    sendNotification(
                                        this.read,
                                        this.modify,
                                        user,
                                        room,
                                        "Schedule the meeting",
                                        blocks
                                    );
                                });
                            });
                        })
                        .catch((e) => this.app.getLogger().error(e));
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
