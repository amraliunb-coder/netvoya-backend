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
        let lastPage = 1;

        try {
            // First request to discover total pages
            console.log(`   Fetching page 1 (discovery)...`);
            const firstResponse = await axios.get(`${API_BASE_URL}/packages?page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const firstData = firstResponse.data?.data || [];
            allPackages = allPackages.concat(firstData);
            const firstMeta = firstResponse.data?.meta;
            if (firstMeta) {
                lastPage = firstMeta.lastPage || 1;
                hasMore = firstMeta.currentPage < lastPage;
            } else {
                hasMore = false;
            }
            page = 2;

            console.log(`   Total pages to fetch: ${lastPage}`);

            // Fetch remaining pages in smaller batches with retries to prevent 429 rate limit
            const BATCH_SIZE = 2;

            const fetchPageWithRetry = async (p: number, retries = 3): Promise<any[]> => {
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const res = await axios.get(`${API_BASE_URL}/packages?page=${p}`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            timeout: 20000
                        });
                        return res.data?.data || [];
                    } catch (err: any) {
                        if (attempt === retries) {
                            console.warn(`⚠️ Failed to fetch page ${p} after ${retries} attempts: ${err.message}`);
                            return [];
                        }
                        // Wait before retrying (e.g., 2s, 4s)
                        await new Promise(r => setTimeout(r, 2000 * attempt));
                    }
                }
                return [];
            };

            while (hasMore && page <= lastPage) {
                const batch = [];
                for (let i = 0; i < BATCH_SIZE && page <= lastPage; i++, page++) {
                    batch.push(page);
                }

                console.log(`   Fetching pages ${batch[0]}–${batch[batch.length - 1]}...`);

                const batchResults = await Promise.all(batch.map(p => fetchPageWithRetry(p)));

                for (const data of batchResults) {
                    allPackages = allPackages.concat(data);
                }

                if (page > lastPage) hasMore = false;

                // Polite delay between batches to respect rate limits
                if (hasMore) await new Promise(resolve => setTimeout(resolve, 1000));
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

    /**
     * Fetch eSIM details and usage by ICCID from the vendor API
     */
    async getEsimDetailsByIccid(iccid: string): Promise<any> {
        // DEMO BYPASS: Specific ICCIDs for Client Simulation
        const DEMO_ICCIDS: Record<string, any> = {
            '8910300000049564025': {
                status: 'Active',
                product_name: 'Egypt 1GB',
                package_label: '1GB Data For 7Day in Egypt, Unthrottled',
                iccid: '8910300000049564025',
                smp_address: 'consumer.e-sim.global',
                activation_code: 'LPA:1$consumer.e-sim.global$D56C93C55620D235',
                balance: {
                    initial_data: '1 GB',
                    remaining_data: '1 GB',
                    expiration_date: '2026-03-03'
                },
                purchase_date: '2026-02-03 10:58:00'
            },
            '8910300000049564873': {
                status: 'Active',
                product_name: 'Egypt 1GB',
                package_label: '1GB Data For 7Day in Egypt, Unthrottled',
                iccid: '8910300000049564873',
                smp_address: 'consumer.e-sim.global',
                activation_code: 'LPA:1$consumer.e-sim.global$EGYPT1GBDEMO02',
                balance: {
                    initial_data: '1 GB',
                    remaining_data: '1 GB',
                    expiration_date: '2026-03-03'
                },
                purchase_date: '2026-02-03 11:05:00'
            }
        };

        if (DEMO_ICCIDS[iccid]) {
            console.log(`⚠️ DEMO MODE: Returning mock data for ICCID ${iccid}`);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));
            return DEMO_ICCIDS[iccid];
        }

        const token = await this.getToken();
        console.log(`📡 Fetching usage details for ICCID: ${iccid}...`);

        try {
            // Updated endpoint to /my-sim/{iccid}/usage which reliably returns usage for active eSIMs
            const response = await axios.get(`${API_BASE_URL}/my-sim/${iccid}/usage`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.status && response.data.data) {
                const vendorData = response.data.data;

                // Map to our internal structure used by server.ts and frontend
                return {
                    iccid: iccid,
                    status: 'Active', // If it has usage, it's Active
                    balance: {
                        initial_data: `${vendorData.initial_data_quantity} ${vendorData.initial_data_unit}`,
                        remaining_data: `${vendorData.rem_data_quantity} ${vendorData.rem_data_unit}`,
                        // Vendor doesn't provide expiration in this specific endpoint, 
                        // we'll leave it null for server.ts to handle
                        expiration_date: null
                    }
                };
            }

            throw new Error(`ICCID ${iccid} not found or no usage data available.`);
        } catch (error: any) {
            console.error(`❌ Error fetching ICCID usage (${iccid}):`, error.response?.data || error.message);
            throw error;
        }
    }
}

export default new EsimVendorService();
