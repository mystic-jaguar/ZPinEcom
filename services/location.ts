import { ApiSuccessResponse, Coordinates } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface LocationData {
    pincode?: string;
    city?: string;
    state?: string;
}

export const locationService = {
    /**
     * Get coordinates from address details (public endpoint)
     */
    async getCoordinates(data: LocationData) {
        try {
            // POST :- /api/v1/public/location/coordinates
            const response = await apiClient.post<ApiSuccessResponse<{
                coordinates: Coordinates['coordinates'];
                location: {
                    city: string;
                    state: string;
                    pincode: string;
                };
            }>>('public/location/coordinates', data);

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
