import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import { SmartSchedulingApp } from "../SmartSchedulingApp";
import { CommandUtility } from "../lib/commandUtility";

export class TemplateCommand implements ISlashCommand {
    public constructor(private readonly app: SmartSchedulingApp) {}
    public command = "temp";
    public i18nDescription = "cmd_description";
    public providesPreview = false;
    public i18nParamsExample = "";

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const command = context.getArguments();
        const sender = context.getSender();
        const room = context.getRoom();

        if (!Array.isArray(command)) {
            return;
        }

        const commandUtility = new CommandUtility({
            sender: sender,
            room: room,
            command: command,
            context: context,
            read: read,
            modify: modify,
            http: http,
            persistence: persistence,
            app: this.app,
        });

        commandUtility.resolveCommand();
    }
}
