import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IApp } from "@rocket.chat/apps-engine/definition/IApp";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UIKitViewCloseInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { ModalEnum } from "../constants/enums";
import { PARTICIPANT_KEY, PROMPT_KEY, ROOM_ID_KEY } from "../constants/keys";
import { getData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";

export class ExecuteViewClosedHandler {
    constructor(
        private readonly app: IApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(context: UIKitViewCloseInteractionContext) {
        const { view } = context.getInteractionData();
        const { user } = context.getInteractionData();

        const { roomId } = await getData(
            this.read.getPersistenceReader(),
            user.id,
            ROOM_ID_KEY
        );
        let room = (await this.read.getRoomReader().getById(roomId)) as IRoom;

        switch (view.id) {
            case ModalEnum.CONFIRMATION_MODAL: {
                const { prompt } = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    PROMPT_KEY
                );
                const { participants } = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    PARTICIPANT_KEY
                );

                await sendNotification(
                    this.read,
                    this.modify,
                    user,
                    room,
                    `=============
                    Testing retry args...
                    Prompt: ${prompt}
                    Participants: ${participants}
                    =============`
                );
            }
        }
        return { success: true } as any;
    }
}
