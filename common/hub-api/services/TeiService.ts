/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TeiService {
    /**
     * Get TEI data for a collection
     * Retrieve TEI data for a specific collection, optionally filtered by key and features
     * @returns string TEI XML data
     * @throws ApiError
     */
    public static getCollectionsTei({
        id,
        key,
        features,
    }: {
        /**
         * Collection ID
         */
        id: string,
        /**
         * Key to filter TEI data
         */
        key?: string,
        /**
         * Comma-separated list of features to filter TEI data
         */
        features?: string,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/collections/{id}/tei',
            path: {
                'id': id,
            },
            query: {
                'key': key,
                'features': features,
            },
        });
    }
}
