import { TextObjectType } from "@rocket.chat/apps-engine/definition/uikit/blocks";

export interface IParticipantProps {
    text: {
        type: TextObjectType;
        text: string;
    };
    value: string;
}
