/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Execution } from '../models/Execution';
import type { ExecutionInput } from '../models/ExecutionInput';
import type { Feature } from '../models/Feature';
import type { FeatureInput } from '../models/FeatureInput';
import type { FeatureRevision } from '../models/FeatureRevision';
import type { FeatureRevisionInput } from '../models/FeatureRevisionInput';
import type { Result } from '../models/Result';
import type { ResultInput } from '../models/ResultInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * List all features for a dataset
     * @returns Feature List of features
     * @throws ApiError
     */
    public static getDatasetFeatures({
        datasetId,
        expand,
    }: {
        datasetId: string,
        /**
         * Comma-separated list of fields to expand (latest_revision, revisions)
         */
        expand?: string,
    }): CancelablePromise<Array<Feature>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dataset/{dataset_id}/features',
            path: {
                'dataset_id': datasetId,
            },
            query: {
                'expand': expand,
            },
        });
    }
    /**
     * Create a new feature
     * @returns Feature Feature created
     * @throws ApiError
     */
    public static postDatasetFeatures({
        datasetId,
        requestBody,
    }: {
        datasetId: string,
        requestBody: FeatureInput,
    }): CancelablePromise<Feature> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/dataset/{dataset_id}/features',
            path: {
                'dataset_id': datasetId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a specific feature
     * @returns Feature Feature details
     * @throws ApiError
     */
    public static getDatasetFeatures1({
        datasetId,
        featureId,
        expand,
    }: {
        datasetId: string,
        featureId: string,
        /**
         * Comma-separated list of fields to expand (latest_revision, revisions)
         */
        expand?: string,
    }): CancelablePromise<Feature> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dataset/{dataset_id}/features/{feature_id}',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
            },
            query: {
                'expand': expand,
            },
        });
    }
    /**
     * Update a feature
     * @returns Feature Feature updated
     * @throws ApiError
     */
    public static putDatasetFeatures({
        datasetId,
        featureId,
        requestBody,
    }: {
        datasetId: string,
        featureId: string,
        requestBody: FeatureInput,
    }): CancelablePromise<Feature> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/dataset/{dataset_id}/features/{feature_id}',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a feature
     * @returns void
     * @throws ApiError
     */
    public static deleteDatasetFeatures({
        datasetId,
        featureId,
        force,
    }: {
        datasetId: string,
        featureId: string,
        /**
         * If true, delete is performed even if there are results
         */
        force?: boolean,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/dataset/{dataset_id}/features/{feature_id}',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
            },
            query: {
                'force': force,
            },
        });
    }
    /**
     * List all revisions for a feature
     * @returns FeatureRevision List of revisions
     * @throws ApiError
     */
    public static getDatasetFeaturesRevisions({
        datasetId,
        featureId,
    }: {
        datasetId: string,
        featureId: string,
    }): CancelablePromise<Array<FeatureRevision>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dataset/{dataset_id}/features/{feature_id}/revisions',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
            },
        });
    }
    /**
     * Create a new revision for a feature
     * @returns FeatureRevision Revision created
     * @throws ApiError
     */
    public static postDatasetFeaturesRevisions({
        datasetId,
        featureId,
        requestBody,
    }: {
        datasetId: string,
        featureId: string,
        requestBody: FeatureRevisionInput,
    }): CancelablePromise<FeatureRevision> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/dataset/{dataset_id}/features/{feature_id}/revisions',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a specific revision
     * @returns FeatureRevision Revision details
     * @throws ApiError
     */
    public static getDatasetFeaturesRevisions1({
        datasetId,
        featureId,
        revisionId,
    }: {
        datasetId: string,
        featureId: string,
        revisionId: string,
    }): CancelablePromise<FeatureRevision> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dataset/{dataset_id}/features/{feature_id}/revisions/{revision_id}',
            path: {
                'dataset_id': datasetId,
                'feature_id': featureId,
                'revision_id': revisionId,
            },
        });
    }
    /**
     * List executions with optional filters
     * @returns Execution List of executions
     * @throws ApiError
     */
    public static getExecutions({
        dataset,
        features,
        status,
    }: {
        dataset?: string,
        /**
         * Comma-separated list of feature IDs
         */
        features?: string,
        /**
         * Comma-separated list of statuses
         */
        status?: string,
    }): CancelablePromise<Array<Execution>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/executions',
            query: {
                'dataset': dataset,
                'features': features,
                'status': status,
            },
        });
    }
    /**
     * Create a new execution
     * @returns Execution Execution created
     * @throws ApiError
     */
    public static postExecutions({
        requestBody,
    }: {
        requestBody: ExecutionInput,
    }): CancelablePromise<Execution> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/executions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get a specific execution
     * @returns Execution Execution details
     * @throws ApiError
     */
    public static getExecutions1({
        executionId,
    }: {
        executionId: string,
    }): CancelablePromise<Execution> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/executions/{execution_id}',
            path: {
                'execution_id': executionId,
            },
        });
    }
    /**
     * Cancel an execution
     * @returns Execution Execution cancellation initiated
     * @throws ApiError
     */
    public static putExecutionsCancel({
        executionId,
    }: {
        executionId: string,
    }): CancelablePromise<Execution> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/executions/{execution_id}/cancel',
            path: {
                'execution_id': executionId,
            },
        });
    }
    /**
     * Get results for a specific key
     * @returns Result Results for the key
     * @throws ApiError
     */
    public static getResults({
        key,
        features,
    }: {
        key: string,
        /**
         * Comma-separated list of feature IDs
         */
        features?: string,
    }): CancelablePromise<Array<Result>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/results/{key}',
            path: {
                'key': key,
            },
            query: {
                'features': features,
            },
        });
    }
    /**
     * Create or update results for a key
     * @returns Result Result created or updated
     * @throws ApiError
     */
    public static postResults({
        key,
        requestBody,
    }: {
        key: string,
        requestBody: ResultInput,
    }): CancelablePromise<Result> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/results/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get TEI XML view
     * @returns binary TEI XML representation
     * @throws ApiError
     */
    public static getDatasetTei({
        datasetId,
        key,
        features,
    }: {
        datasetId: string,
        key: string,
        /**
         * Comma-separated list of feature IDs
         */
        features?: string,
    }): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dataset/{dataset_id}/tei',
            path: {
                'dataset_id': datasetId,
            },
            query: {
                'key': key,
                'features': features,
            },
        });
    }
}
