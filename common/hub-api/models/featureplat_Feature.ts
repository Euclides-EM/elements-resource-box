/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureRevision } from './featureplat_FeatureRevision';
export type featureplat_Feature = {
    /**
     * collection scope
     */
    collection_id?: string;
    /**
     * optional UI color (hex)
     */
    color?: string;
    readonly created_at?: string;
    description?: string;
    readonly id?: string;
    /**
     * whether this feature should be used by default
     */
    is_default?: boolean;
    /**
     * immutable
     */
    is_root?: boolean;
    /**
     * ONLY if expand=latest_revision
     */
    readonly latest_revision?: featureplat_FeatureRevision;
    name?: string;
    /**
     * ONLY if expand=revisions
     */
    readonly revisions?: Array<featureplat_FeatureRevision>;
    readonly updated_at?: string;
};

