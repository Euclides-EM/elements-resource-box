/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { featureplat_FeatureRevision } from '../models/featureplat_FeatureRevision';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeatureRevisionsService {
    /**
     * List Feature Revisions
     * Get a list of revisions for a specific feature
     * @returns featureplat_FeatureRevision OK
     * @throws ApiError
     */
    public static getCollectionsFeaturesRevisions({
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
    }): CancelablePromise<Array<featureplat_FeatureRevision>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionId}/features/{featureId}/revisions',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
            },
        });
    }
    /**
     * Create Feature Revision
     * Create a new revision for a specific feature
     * @returns featureplat_FeatureRevision OK
     * @throws ApiError
     */
    public static postCollectionsFeaturesRevisions({
        collectionId,
        featureId,
        revision,
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
         * Revision data
         */
        revision: featureplat_FeatureRevision,
    }): CancelablePromise<featureplat_FeatureRevision> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/collections/{collectionId}/features/{featureId}/revisions',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
            },
            body: revision,
        });
    }
    /**
     * Get Feature Revision
     * Get details of a specific feature revision
     * @returns featureplat_FeatureRevision OK
     * @throws ApiError
     */
    public static getCollectionsFeaturesRevisions1({
        collectionId,
        featureId,
        revisionId,
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
         * Revision ID
         */
        revisionId: string,
    }): CancelablePromise<featureplat_FeatureRevision> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{collectionId}/features/{featureId}/revisions/{revisionId}',
            path: {
                'collectionId': collectionId,
                'featureId': featureId,
                'revisionId': revisionId,
            },
        });
    }
}
