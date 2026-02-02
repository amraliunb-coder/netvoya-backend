import axios from 'axios';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

// Configuration
const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';

export interface VendorAuthResponse {
    access_token: string;
    // Add other fields if returned
}

export interface VendorPackage {
    slug: string;
    location_name: string;
    amount: number;
    duration: number;
    duration_unit: string;
    price_retail: number;
    price_wholesale: number;
}

export interface VendorPricing {
    // Define structure based on API response
    [key: string]: any;
}

class EsimVendorService extends EventEmitter {
    private token: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        super();
    }

    /**
     * Authenticate with the eSIMCard.com API
     */
    async login(): Promise<string> {
        if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.token;
        }

        console.log('📡 Authenticating with eSIM Vendor API...');

        try {
            const response = await axios.post(`${API_BASE_URL}/login`, {
                email: VENDOR_EMAIL,
                password: VENDOR_PASSWORD
            });

            // Assuming `access_token` is in response.data or response.data.access_token
            // Adjust based on actual response structure
            const accessToken = response.data?.access_token || response.data?.token;

            if (!accessToken) {
                console.error('Login Response:', response.data);
                throw new Error('No access token received from vendor login.');
            }

            this.token = accessToken;
            // Set expiry to 24h from now (or parse from token if JWT)
            this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

            console.log('✅ Vendor Login Successful');
            return this.token as string;
        } catch (error: any) {
            console.error('❌ Vendor Login Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get validated token for requests
     */
    private async getToken(): Promise<string> {
        if (!this.token) {
            return await this.login();
        }
        return this.token as string;
    }

    /**
     * Fetch all available packages
     */
    async getPackages(): Promise<any[]> {
        const token = await this.getToken();
        console.log('📡 Fetching ALL vendor packages...');

        let allPackages: any[] = [];
        let page = 1;
        let hasMore = true;

        try {
            while (hasMore) {
                try {
                    console.log(`   Fetching page ${page}...`);
                    const response = await axios.get(`${API_BASE_URL}/packages?page=${page}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    // Extract data
                    const data = response.data?.data || [];
                    allPackages = allPackages.concat(data);

                    // Check pagination keys (camelCase)
                    const meta = response.data?.meta;
                    if (meta && meta.currentPage < meta.lastPage) {
                        page++;
                    } else {
                        hasMore = false;
                    }
                } catch (error: any) {
                    // Retry once on 401
                    if (error.response?.status === 401) {
                        console.log(`🔄 Token expired at page ${page}, re-login...`);
                        this.token = null;
                        const newToken = await this.getToken();
                        // Retry current page
                        const retryResponse = await axios.get(`${API_BASE_URL}/packages?page=${page}`, {
                            headers: { 'Authorization': `Bearer ${newToken}` }
                        });
                        const data = retryResponse.data?.data || [];
                        allPackages = allPackages.concat(data);

                        const meta = retryResponse.data?.meta;
                        if (meta && meta.currentPage < meta.lastPage) {
                            page++;
                        } else {
                            hasMore = false;
                        }
                    } else {
                        throw error;
                    }
                }

                // Rate limiting to avoid 429
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            console.log(`✅ Fetched ${allPackages.length} packages total.`);
            return allPackages;
        } catch (error: any) {
            console.error('❌ Vendor Valid Packages Error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch pricing information
     */
    async getPricing(): Promise<any> {
        const token = await this.getToken();
        console.log('📡 Fetching vendor pricing...');

        try {
            const response = await axios.get(`${API_BASE_URL}/pricing`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Vendor Pricing Error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch balance
     */
    async getBalance(): Promise<number> {
        // Placeholder until endpoint is known
        return 0;
    }
}

export default new EsimVendorService();
