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
    getMeetingArguments,
} from "../core/llms";
import { confirmationModal } from "../modals/confirmationModal";
// import { generateChatCompletions } from "../core/llms";
import { PARTICIPANT_KEY, PROMPT_KEY, ROOM_ID_KEY } from "../constants/keys";
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

        switch (view.id) {
            case ModalEnum.CONFIRMATION_MODAL: {
                await sendNotification(
                    this.read,
                    this.modify,
                    user,
                    room,
                    "> **Meeting scheduled**"
                );
            }
            case ModalEnum.PROMPT_MODAL: {
                try {
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
                        {
                            participants,
                        }
                    );

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
                                    const triggerId =
                                        context.getInteractionData().triggerId;
                                    const modal = confirmationModal({
                                        modify: this.modify,
                                        read: this.read,
                                        persistence: this.persistence,
                                        http: this.http,
                                        uiKitContext: context,
                                        summary: `
                                        -----------
                                        Participants: ${participants}
                                        Args: ${JSON.stringify(res)}
                                        -----------
                                        `,
                                    });
                                    this.modify
                                        .getUiController()
                                        .openModalView(
                                            modal,
                                            { triggerId },
                                            user
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
                        `It may take a while. Please wait... :clock12:`
                    );
                    return context.getInteractionResponder().successResponse();
                } catch (e) {
                    return context.getInteractionResponder().errorResponse();
                }
            }
        }

        await sendNotification(
            this.read,
            this.modify,
            user,
            room,
            "Invalid view id"
        );
        return {
            success: false,
            error: "Invalid view id",
            ...view,
        };
    }
}
