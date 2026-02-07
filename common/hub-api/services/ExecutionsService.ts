/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureExecution } from '../models/featureplat_FeatureExecution';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExecutionsService {
    /**
     * List Executions
     * Get a list of all executions for a specific edition
     * @returns featureplat_FeatureExecution OK
     * @throws ApiError
     */
    public static getExecutions({
        collection,
        features,
        statuses,
    }: {
        /**
         * Filter by collection ID
         */
        collection?: string,
        /**
         * Filter by delimited list of feature IDs
         */
        features?: string,
        /**
         * Filter by delimited list of execution statuses
         */
        statuses?: 'pending' | 'running' | 'completed' | 'failed',
    }): CancelablePromise<Array<featureplat_FeatureExecution>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/executions',
            query: {
                'collection': collection,
                'features': features,
                'statuses': statuses,
            },
        });
    }
    /**
     * Create Execution
     * Create a new execution for a specific feature
     * @returns featureplat_FeatureExecution OK
     * @throws ApiError
     */
    public static postExecutions({
        execution,
    }: {
        /**
         * Execution to create
         */
        execution: featureplat_FeatureExecution,
    }): CancelablePromise<featureplat_FeatureExecution> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/executions',
            body: execution,
        });
    }
    /**
     * Get Execution
     * Get details of a specific execution by ID
     * @returns featureplat_FeatureExecution OK
     * @throws ApiError
     */
    public static getExecutions1({
        executionId,
    }: {
        /**
         * Execution ID
         */
        executionId: string,
    }): CancelablePromise<featureplat_FeatureExecution> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/executions/{executionId}',
            path: {
                'executionId': executionId,
            },
        });
    }
    /**
     * Cancel Execution
     * Cancel a running execution by ID
     * @returns string status: cancelled
     * @throws ApiError
     */
    public static putExecutionsCancel({
        executionId,
    }: {
        /**
         * Execution ID
         */
        executionId: string,
    }): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/executions/{executionId}/cancel',
            path: {
                'executionId': executionId,
            },
        });
    }
}
