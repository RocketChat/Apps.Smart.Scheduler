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
    MEETING_ARGS_KEY,
    PARTICIPANT_KEY,
    PREFFERED_ARGS_KEY,
    PROMPT_KEY,
    RETRIABLE_PROMPT_KEY,
    RETRY_COUNT_KEY,
    ROOM_ID_KEY,
} from "../constants/keys";
import { setMeeting } from "../core/googleCalendar";
import {
    generateConstraintPrompt,
    getCommonTimeInString,
    getMeetingArguments,
    getRecommendedTime,
} from "../core/llms";
import { constructReminderPrompt } from "../core/prompts";
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

                    if (!args) {
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            `Trigger \`\\schedule\` first`
                        );

                        return {
                            success: false,
                            error: "No preference found",
                        };
                    }

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

                    const meetingTopic =
                        view.state?.["meetingSummaryBlockId"][
                            "meetingSummaryBlockId"
                        ] || meetingSummary;

                    const preferredDate =
                        view.state?.["preferredDateBlockId"][
                            "preferredDateBlockId"
                        ] || args.preferredDate;

                    if (!preferredDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Date must be in YYYY-MM-DD format"
                        );

                        return {
                            success: false,
                            error: "Invalid date format",
                        };
                    }

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
                        meetingTopic
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
                        `AI is thinking, it may take a while... :clock12:`
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

                    if (!prompt) {
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
                        this.persistence,
                        user,
                        prompt
                    )
                        .then((res) => {
                            sendNotification(
                                this.read,
                                this.modify,
                                user,
                                room,
                                `I just got your preference. Please wait...`
                            );

                            if (prompt.toLocaleLowerCase().includes("remind")) {
                                storeData(
                                    this.persistence,
                                    user.id,
                                    RETRIABLE_PROMPT_KEY,
                                    { retriable: false }
                                );

                                const reminderPrompt = constructReminderPrompt(
                                    user,
                                    prompt,
                                    participants,
                                    res
                                );

                                getMeetingArguments(
                                    this.app,
                                    this.http,
                                    reminderPrompt
                                ).then((res) => {
                                    res.meetingSummary =
                                        res.meetingSummary ||
                                        "Reminders from Rocket.Chat";

                                    const blocks = confirmationBlock({
                                        modify: this.modify,
                                        read: this.read,
                                        persistence: this.persistence,
                                        http: this.http,
                                        summary: res,
                                        userOffset: 0,
                                    });

                                    sendNotification(
                                        this.read,
                                        this.modify,
                                        user,
                                        room,
                                        "Reminder of the meeting",
                                        blocks
                                    );
                                });
                            } else {
                                storeData(
                                    this.persistence,
                                    user.id,
                                    RETRIABLE_PROMPT_KEY,
                                    { retriable: true }
                                );

                                getCommonTimeInString(
                                    this.app,
                                    this.http,
                                    this.persistence,
                                    user,
                                    participants,
                                    res
                                ).then((res) => {
                                    getRecommendedTime(
                                        this.app,
                                        this.http,
                                        prompt,
                                        res
                                    ).then((res) => {
                                        sendNotification(
                                            this.read,
                                            this.modify,
                                            user,
                                            room,
                                            `Just a little more... ;)`
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
                                                userOffset: user.utcOffset,
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
                            }
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
                        `AI is retrying... :robot:`
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

                    if (!newArgs.preferredDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Date must be in YYYY-MM-DD format"
                        );

                        return {
                            success: false,
                            error: "Invalid date format",
                        };
                    }

                    if (
                        !newArgs.timeMin.match(/^\d{2}:\d{2}:\d{2}$/) ||
                        !newArgs.timeMax.match(/^\d{2}:\d{2}:\d{2}$/)
                    ) {
                        await sendNotification(
                            this.read,
                            this.modify,
                            user,
                            room,
                            "Time must be in HH:MM:SS format"
                        );

                        return {
                            success: false,
                            error: "Invalid time format",
                        };
                    }

                    await storeData(
                        this.persistence,
                        user.id,
                        PREFFERED_ARGS_KEY,
                        newArgs
                    );

                    getCommonTimeInString(
                        this.app,
                        this.http,
                        this.persistence,
                        user,
                        participants,
                        newArgs
                    )
                        .then((res) => {
                            getRecommendedTime(
                                this.app,
                                this.http,
                                prompt,
                                res
                            ).then((res) => {
                                sendNotification(
                                    this.read,
                                    this.modify,
                                    user,
                                    room,
                                    `Just a little more... ;)`
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
                                        userOffset: user.utcOffset,
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
