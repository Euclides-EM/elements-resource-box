/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureRevision } from './FeatureRevision';
export type Feature = {
    id?: string;
    name?: string;
    description?: string;
    /**
     * Immutable flag indicating if this is a root feature
     */
    is_root?: boolean;
    /**
     * Whether this feature should be used by default
     */
    is_default?: boolean;
    created_at?: string;
    updated_at?: string;
    /**
     * Only included if expand=latest_revision
     */
    latest_revision?: FeatureRevision;
    /**
     * Only included if expand=revisions
     */
    revisions?: Array<FeatureRevision>;
};

