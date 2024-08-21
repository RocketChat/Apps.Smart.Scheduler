import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { UIKitViewCloseInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { SmartSchedulingApp } from "../SmartSchedulingApp";

export class ExecuteViewClosedHandler {
    constructor(
        private readonly app: SmartSchedulingApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(context: UIKitViewCloseInteractionContext) {
        return { success: true } as any;
    }
}
