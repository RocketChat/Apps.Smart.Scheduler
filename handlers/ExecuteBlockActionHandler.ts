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

import { dummyModal } from "../modals/dummyModal";

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

        const contextualbarBlocks = await dummyModal(
            this.modify,
            data.container.id
        );

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
