/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_Feature } from '../models/featureplat_Feature';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeaturesService {
    /**
     * List Features
     * Get a list of available features for the collection
     * @returns featureplat_Feature OK
     * @throws ApiError
     */
    public static getCollectionsFeatures({
        collectionId,
        expand,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Include related entities
         */
        expand?: Array<string>,
    }): CancelablePromise<Array<featureplat_Feature>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionId}/features',
            path: {
                'collectionId': collectionId,
            },
            query: {
                'expand': expand,
            },
        });
    }
    /**
     * Create Feature
     * Create a new feature for the collection
     * @returns featureplat_Feature OK
     * @throws ApiError
     */
    public static postCollectionsFeatures({
        collectionId,
        feature,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Feature to create
         */
        feature: featureplat_Feature,
    }): CancelablePromise<featureplat_Feature> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/collections/{collectionId}/features',
            path: {
                'collectionId': collectionId,
            },
            body: feature,
        });
    }
    /**
     * Delete Feature
     * Delete a feature from the collection
     * @returns void
     * @throws ApiError
     */
    public static deleteCollectionsFeatures({
        collectionId,
        featureId,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Feature ID
         */
        featureId: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/collections/{collectionId}/features/{featureId}',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
            },
        });
    }
    /**
     * Get Feature
     * Get details of a specific feature from the collection
     * @returns featureplat_Feature OK
     * @throws ApiError
     */
    public static getCollectionsFeatures1({
        collectionId,
        featureId,
        expand,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Feature ID
         */
        featureId: string,
        /**
         * Include related entities
         */
        expand?: Array<string>,
    }): CancelablePromise<featureplat_Feature> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionId}/features/{featureId}',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
            },
            query: {
                'expand': expand,
            },
        });
    }
    /**
     * Update Feature
     * Update an existing feature in the collection
     * @returns featureplat_Feature OK
     * @throws ApiError
     */
    public static putCollectionsFeatures({
        collectionId,
        featureId,
        feature,
    }: {
        /**
         * Collection ID
         */
        collectionId: string,
        /**
         * Feature ID
         */
        featureId: string,
        /**
         * Updated feature data
         */
        feature: featureplat_Feature,
    }): CancelablePromise<featureplat_Feature> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/collections/{collectionId}/features/{featureId}',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
            },
            body: feature,
        });
    }
}
