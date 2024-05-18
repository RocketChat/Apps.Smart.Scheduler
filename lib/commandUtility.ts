import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { ExecutorProps } from "../definitions/ExecutorProps";

import { dummyModal } from "../modals/dummyModal";

export class CommandUtility {
    sender: IUser;
    room: IRoom;
    command: string[];
    context: SlashCommandContext;
    read: IRead;
    modify: IModify;
    http: IHttp;
    persistence: IPersistence;
    app: SmartSchedulingApp;

    constructor(props: ExecutorProps) {
        this.sender = props.sender;
        this.room = props.room;
        this.command = props.command;
        this.context = props.context;
        this.read = props.read;
        this.modify = props.modify;
        this.http = props.http;
        this.persistence = props.persistence;
        this.app = props.app;
    }

    public async resolveCommand() {
        // [1] - first we get the triggerId  to open the surface (without this it would not be possible to open the contextual bar)
        const triggerId = this.context.getTriggerId() as string;
        const user = this.context.getSender();
        // [2] - then we create the blocks we will render inside the contextual bar.
        const contextualbarBlocks = await dummyModal(this.modify);
        // [3] - then call the method that opens the contextual bar. (opens triggers when the command is executed)
        await this.modify
            .getUiController()
            .openModalView(contextualbarBlocks, { triggerId }, user);
    }
}
