export interface IFunctionCall {
    functionName: string;
    arguments: {
        [key: string]: any;
    };
}
