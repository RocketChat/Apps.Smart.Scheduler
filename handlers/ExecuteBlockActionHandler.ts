import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";

import { promptModal } from "../modals/promptModal";

export class ExecuteBlockActionHandler {
    constructor(
        private readonly app: SmartSchedulingApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(
        context: UIKitBlockInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        const contextualbarBlocks = await promptModal({
            modify: this.modify,
            read: this.read,
            persistence: this.persistence,
            http: this.http,
            slashCommandContext: undefined,
            uiKitContext: context,
        });

        // [9] we update the contextual bar's content.
        await this.modify
            .getUiController()
            .updateModalView(
                contextualbarBlocks,
                { triggerId: data.triggerId },
                data.user
            );

        return {
            success: true,
        };
    }
}
