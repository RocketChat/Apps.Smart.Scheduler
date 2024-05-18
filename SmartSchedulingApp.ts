import { App } from "@rocket.chat/apps-engine/definition/App";
import {
    IAppAccessors,
    IConfigurationExtend,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { TemplateCommand } from "./commands/TemplateCommand";
import { ExecuteBlockActionHandler } from "./handlers/ExecuteBlockActionHandler";

export class SmartSchedulingApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend
    ): Promise<void> {
        const templateCommand: TemplateCommand = new TemplateCommand(this);

        await Promise.all([
            configuration.slashCommands.provideSlashCommand(templateCommand),
        ]);
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const handler = new ExecuteBlockActionHandler(
            this,
            read,
            http,
            modify,
            persistence
        );
        return await handler.run(context);
    }
}
