/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Result = {
    feature?: string;
    source?: {
        resp?: 'automatic' | 'human';
        id?: string;
        revision?: string;
        name?: string;
    };
    values?: Array<{
        root?: string;
        childrens?: Array<{
            feature?: string;
            source?: {
                resp?: string;
                name?: string;
                id?: string;
                revision?: string;
            };
            values?: Array<{
                root?: string;
            }>;
            note?: string;
        }>;
    }>;
    note?: string;
};

