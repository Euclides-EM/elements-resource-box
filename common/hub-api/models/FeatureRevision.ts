/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type FeatureRevision = {
    id?: string;
    prompt?: string;
    regex?: string;
    execution_strategy?: 'prompt' | 'regex';
    note?: string;
    type?: 'annotation' | 'ner';
    /**
     * Only if the parent feature is root. All child features must NOT be root.
     */
    features?: Array<{
        id?: string;
    }>;
    created_at?: string;
};

