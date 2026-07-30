import { ApiSuccessResponse, Coordinates } from '../types/types';
import apiClient, { handleApiError } from './api';

export interface LocationData {
    pincode?: string;
    city?: string;
    state?: string;
}

/**
 * India Post pincode lookup — returns city/state for a 6-digit pincode, or null.
 * Same public API the customer website uses (AddAddress.jsx).
 */
export async function lookupPincode(pincode: string): Promise<{ city: string; state: string } | null> {
    if (!/^\d{6}$/.test(pincode)) return null;
    try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        const po = data?.[0]?.Status === 'Success' ? data[0]?.PostOffice?.[0] : null;
        return po ? { city: po.District || '', state: po.State || '' } : null;
    } catch {
        return null; // let the user type it manually
    }
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
