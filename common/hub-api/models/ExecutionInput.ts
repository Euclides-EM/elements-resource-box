/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExecutionInput = {
    dataset: string;
    keys?: Array<string>;
    apply: Array<{
        feature?: string;
        revision?: string;
    }>;
    policy?: {
        skip_if?: Array<string>;
    };
};

