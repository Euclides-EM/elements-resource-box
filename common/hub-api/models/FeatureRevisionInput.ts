/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FeatureRevisionInput = {
    prompt?: string;
    regex?: string;
    execution_strategy: 'prompt' | 'regex';
    note?: string;
    type: 'annotation' | 'ner';
    features?: Array<{
        id?: string;
    }>;
};

