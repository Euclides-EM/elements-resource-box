/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureExecutionApplyItem } from './featureplat_FeatureExecutionApplyItem';
import type { featureplat_FeatureExecutionPolicy } from './featureplat_FeatureExecutionPolicy';
import type { featureplat_FeatureExecutionStatus } from './featureplat_FeatureExecutionStatus';
export type featureplat_FeatureExecution = {
    apply?: Array<featureplat_FeatureExecutionApplyItem>;
    collection?: string;
    readonly created_at?: string;
    description?: string;
    readonly id?: string;
    /**
     * if not provided -> run on all keys.
     */
    keys?: Array<string>;
    name?: string;
    policy?: featureplat_FeatureExecutionPolicy;
    /**
     * "success"|"failed"|"in_prpgress"|"canceling"|"canceled"
     */
    status?: featureplat_FeatureExecutionStatus;
    readonly updated_at?: string;
};

