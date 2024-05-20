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
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { PromptCommand } from "./commands/PromptCommand";
import { ExecuteBlockActionHandler } from "./handlers/ExecuteBlockActionHandler";
import { ExecuteViewSubmitHandler } from "./handlers/ExecuteViewSubmitHandler";

export class SmartSchedulingApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend
    ): Promise<void> {
        const promptCommand: PromptCommand = new PromptCommand(this);

        await Promise.all([
            configuration.slashCommands.provideSlashCommand(promptCommand),
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

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ) {
        const handler = new ExecuteViewSubmitHandler(
            this,
            read,
            http,
            modify,
            persistence
        );
        return await handler.run(context);
    }
}
