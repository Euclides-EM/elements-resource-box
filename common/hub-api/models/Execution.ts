/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Execution = {
    id?: string;
    created_at?: string;
    completed_at?: string;
    dataset?: string;
    /**
     * If not provided, run on all keys
     */
    keys?: Array<string>;
    apply?: Array<{
        feature?: string;
        /**
         * If not provided, using latest
         */
        revision?: string;
    }>;
    policy?: {
        skip_if?: Array<'feature_exist' | 'revision_exist' | 'human_reviewed'>;
    };
    status?: 'success' | 'failed' | 'in_progress' | 'canceling' | 'canceled';
};

