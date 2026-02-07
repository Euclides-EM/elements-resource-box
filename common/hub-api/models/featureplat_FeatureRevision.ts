/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureExecutionStrategy } from './featureplat_FeatureExecutionStrategy';
import type { featureplat_FeatureType } from './featureplat_FeatureType';
import type { featureplat_Reference } from './featureplat_Reference';
export type featureplat_FeatureRevision = {
    /**
     * collection scope
     */
    collection_id?: string;
    readonly created_at?: string;
    description?: string;
    /**
     * "prompt" or "regex"
     */
    execution_strategy?: featureplat_FeatureExecutionStrategy;
    /**
     * parent feature ID
     */
    feature_id?: string;
    /**
     * list of feature IDs that are part of this revision; only if the parent feature is root
     */
    readonly features?: Array<featureplat_Reference>;
    readonly id?: string;
    name?: string;
    /**
     * optional note about the revision
     */
    note?: string;
    /**
     * only if execution_strategy=prompt
     */
    prompt?: string;
    /**
     * only if execution_strategy=regex
     */
    regex?: string;
    /**
     * "annotation" or "ner"
     */
    type?: featureplat_FeatureType;
    readonly updated_at?: string;
};

