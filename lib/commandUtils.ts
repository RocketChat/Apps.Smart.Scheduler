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
import { IExecutorProps } from "../definitions/IExecutorProps";

import {
    COMMON_TIMES_KEY,
    MEETING_ARGS_KEY,
    PREFFERED_ARGS_KEY,
} from "../constants/keys";
import { functionsMap } from "../core/functionCall";
import { getFunction } from "../core/llms";
import { authorize } from "../modals/authModal";
import { pickModal } from "../modals/pickModal";
import { promptModal } from "../modals/promptModal";
import { retryModal } from "../modals/retryModal";
import { getData } from "./dataStore";
import { sendNotification } from "./messages";

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

    constructor(props: IExecutorProps) {
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
        const commandLength = this.command.length;
        if (commandLength === 1) {
            const command = this.command[0];
            if (command === "authorize") {
                authorize(
                    this.app,
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    this.persistence
                );
            } else if (command === "retry") {
                const triggerId = this.context.getTriggerId() as string;
                const user = this.context.getSender();
                const args = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    PREFFERED_ARGS_KEY
                );

                const modal = await retryModal({
                    modify: this.modify,
                    read: this.read,
                    persistence: this.persistence,
                    http: this.http,
                    preferredArgs: args,
                    slashCommandContext: this.context,
                    uiKitContext: undefined,
                });

                await this.modify
                    .getUiController()
                    .openModalView(modal, { triggerId }, user);
            } else if (command === "pick") {
                const triggerId = this.context.getTriggerId() as string;
                const user = this.context.getSender();
                const args = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    PREFFERED_ARGS_KEY
                );

                const availableTimes = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    COMMON_TIMES_KEY
                );

                const { meetingSummary } = await getData(
                    this.read.getPersistenceReader(),
                    user.id,
                    MEETING_ARGS_KEY
                );

                if (!availableTimes) {
                    await sendNotification(
                        this.read,
                        this.modify,
                        this.sender,
                        this.room,
                        "No common times available. Trigger `/schedule` first."
                    );
                    return;
                }

                const modal = await pickModal({
                    modify: this.modify,
                    read: this.read,
                    persistence: this.persistence,
                    http: this.http,
                    preferredDate: args.preferredDate,
                    availableTimes: availableTimes,
                    meetingSummary: meetingSummary,
                    slashCommandContext: this.context,
                    uiKitContext: undefined,
                    userOffset: this.sender.utcOffset,
                });

                await this.modify
                    .getUiController()
                    .openModalView(modal, { triggerId }, user);
            } else if (command === "help") {
                sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `How to use the Smart Scheduling App
                    *Pre-requisites*: 
                    - You need to authorize the app to access your calendar. Use the command \`/schedule authorize\` to authorize the app.

                    *Usage*:
                    _1. Ask the AI about the schedule._
                    > To ask the AI about the schedule, use the command \`/schedule ask <question>\`. For example, \`/schedule ask What is @username for tomorrow?\`.

                    _2. Schedule a meeting._
                    > To schedule a meeting, use the command \`/schedule\`. The app will ask you for the meeting details.
                    > If you are not satisfied with the suggested time, you can retry the scheduling by using the command \`/schedule retry\`.
                    > However, if you are still not satisfied with the suggested time, you can pick a common time by using the command \`/schedule pick\`.
                    
                    *Command summary*:                
                    - \`/schedule\` to schedule a meeting.
                    - \`/schedule authorize\` to authorize the app for Google Calendar access.
                    - \`/schedule ask <question>\` to ask the AI about the schedule.
                    - \`/schedule retry\` to retry the scheduling.
                    - \`/schedule pick\` to pick a common time.
                    - \`/schedule help\` to see this message.
                `
                );
            } else {
                await sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `Command: '${this.command[0]}' not found.`
                );
            }
        } else {
            if (this.command[0] === "ask") {
                const question = this.command.slice(1).join(" ");

                sendNotification(
                    this.read,
                    this.modify,
                    this.sender,
                    this.room,
                    `_Your question was: ${question}_`
                );

                const members = await this.read
                    .getRoomReader()
                    .getMembers(this.room.id);

                getFunction(this.app, this.http, this.sender, question).then(
                    (res) => {
                        functionsMap[res.functionName]({
                            app: this.app,
                            http: this.http,
                            user: this.sender,
                            ...res.arguments,
                            roomMembers: members,
                        }).then((res) => {
                            sendNotification(
                                this.read,
                                this.modify,
                                this.sender,
                                this.room,
                                res
                            );
                        });
                    }
                );
            } else {
                const triggerId = this.context.getTriggerId() as string;
                const user = this.context.getSender();

                const modal = await promptModal({
                    modify: this.modify,
                    read: this.read,
                    persistence: this.persistence,
                    http: this.http,
                    slashCommandContext: this.context,
                    uiKitContext: undefined,
                });

                await this.modify
                    .getUiController()
                    .openModalView(modal, { triggerId }, user);
            }
        }
    }
}
