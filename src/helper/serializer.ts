
import { Stats } from "./stats";

export const FAIL = Symbol("fail");

export type Serializer = (obj: any, stats: Stats, next: () => IResult) => typeof FAIL | IResult;

export interface IResult { toString(level: string, safe: boolean): string }