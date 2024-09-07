export interface ITreeNode {
    name: string;
    overlappedTime: [number, number];
    children: ITreeNode[];
}
