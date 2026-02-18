/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureResult } from '../models/featureplat_FeatureResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeatureResultsService {
    /**
     * List feature results
     * Get a list of feature results
     * @returns featureplat_FeatureResult OK
     * @throws ApiError
     */
    public static getCollectionsResults({
        collectionId,
        keys,
        features,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Comma-separated list of keys to filter results
         */
        keys?: string,
        /**
         * Comma-separated list of feature names to filter results
         */
        features?: string,
    }): CancelablePromise<Array<featureplat_FeatureResult>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionId}/results',
            path: {
                'collectionId': collectionId,
            },
            query: {
                'keys': keys,
                'features': features,
            },
        });
    }
    /**
     * Create a feature result
     * Create a new feature result
     * @returns featureplat_FeatureResult OK
     * @throws ApiError
     */
    public static postCollectionsResults({
        collectionId,
        result,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Feature result data
         */
        result: featureplat_FeatureResult,
    }): CancelablePromise<featureplat_FeatureResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/collections/{collectionId}/results',
            path: {
                'collectionId': collectionId,
            },
            body: result,
        });
    }
}
