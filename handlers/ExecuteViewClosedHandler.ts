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
import { getData } from "../lib/dataStore";
import { sendNotification } from "../lib/messages";
import { getInteractionRoomData } from "../lib/roomInteraction";

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

        const { roomId } = await getInteractionRoomData(
            this.read.getPersistenceReader(),
            user.id
        );
        let room = (await this.read.getRoomReader().getById(roomId)) as IRoom;

        switch (view.id) {
            case ModalEnum.CONFIRMATION_MODAL: {
                const { prompt } = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    "prompt"
                );
                const { participants } = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    "participants"
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
