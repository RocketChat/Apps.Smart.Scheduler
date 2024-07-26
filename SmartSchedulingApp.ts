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
    IAuthData,
    IOAuth2ClientOptions,
} from "@rocket.chat/apps-engine/definition/oauth2/IOAuth2";
import { createOAuth2Client } from "@rocket.chat/apps-engine/definition/oauth2/OAuth2";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { OAuth2Client } from "@rocket.chat/apps-engine/server/oauth2/OAuth2Client";
import { ScheduleCommand } from "./commands/ScheduleCommand";
import { settings } from "./constants/settings";
import { ExecuteBlockActionHandler } from "./handlers/ExecuteBlockActionHandler";
import { ExecuteViewSubmitHandler } from "./handlers/ExecuteViewSubmitHandler";
import { sendNotification } from "./lib/messages";
import {
    clearInteractionRoomData,
    getInteractionRoomData,
} from "./lib/roomInteraction";

export class SmartSchedulingApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend
    ): Promise<void> {
        const scheduleCommand = new ScheduleCommand(this);

        await Promise.all([
            ...settings.map((setting) =>
                configuration.settings.provideSetting(setting)
            ),
            configuration.slashCommands.provideSlashCommand(scheduleCommand),
            this.getOauth2ClientInstance().setup(configuration),
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

    public async authorizationCallback(
        token: IAuthData,
        user: IUser,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ) {
        let text = `Authentication Succesfull 🚀`;
        let interactionData = await getInteractionRoomData(
            read.getPersistenceReader(),
            user.id
        );

        if (token) {
            // await modify.getScheduler().scheduleOnce(deleteTokenTask);
        } else {
            text = `Authentication Failure 😔`;
        }
        if (interactionData && interactionData.roomId) {
            let roomId = interactionData.roomId as string;
            let room = (await read.getRoomReader().getById(roomId)) as IRoom;
            await clearInteractionRoomData(persistence, user.id);
            await sendNotification(read, modify, user, room, text);
        }
    }
    public oauth2ClientInstance: OAuth2Client;
    public getOauth2ClientInstance(): OAuth2Client {
        const oauthConfig: IOAuth2ClientOptions = {
            alias: "smart-scheduling-app",
            accessTokenUri: "https://oauth2.googleapis.com/token",
            authUri: "https://accounts.google.com/o/oauth2/auth",
            refreshTokenUri: "https://oauth2.googleapis.com/token",
            revokeTokenUri: "https://oauth2.googleapis.com/revoke",
            defaultScopes: ["https://www.googleapis.com/auth/calendar"],
            authorizationCallback: this.authorizationCallback.bind(this),
        };

        try {
            if (!this.oauth2ClientInstance) {
                this.oauth2ClientInstance = createOAuth2Client(
                    this,
                    oauthConfig
                );
            }
        } catch (error) {
            this.getLogger().error("getOauth2ClientInstance error", error);
        }
        return this.oauth2ClientInstance;
    }
}
