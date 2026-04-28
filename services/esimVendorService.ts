import axios from 'axios';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

// Configuration
const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';

// =============================================================================
// INTERFACES — Aligned with vendor API documentation
// =============================================================================

export interface VendorAuthResponse {
    status: boolean;
    access_token: string;
    token_type: string;
    user: {
        id: number;
        name: string;
        email: string;
        balance: number;
    };
}

export interface VendorPackage {
    id: string;           // UUID
    name: string;
    price: string;        // String decimal e.g. "3.61"
    data_quantity: number;
    data_unit: string;    // "GB"
    voice_quantity?: number;
    voice_unit?: string;  // "Minutes"
    sms_quantity?: number;
    package_validity: number;
    package_validity_unit: string; // "Day"
    package_type?: string;        // "DATA-ONLY" | "DATA-VOICE-SMS"
    unlimited?: boolean;
}

export interface VendorPackageDetail extends VendorPackage {
    romaing_countries?: VendorCountryWithCoverage[];
    countries?: VendorCountryWithCoverage[];
}

export interface VendorCountry {
    id: number;
    name: string;
    image_url: string;
}

export interface VendorCountryWithCoverage extends VendorCountry {
    network_coverage: VendorNetworkCoverage[];
}

export interface VendorContinent {
    id: number;
    name: string;
    code: string;
    image_url: string;
}

export interface VendorNetworkCoverage {
    network_name: string;
    network_code: string;
    two_g: boolean;
    three_g: boolean;
    four_G: boolean;
    five_G: boolean;
}

export interface VendorPaginatedResponse<T> {
    status: boolean;
    meta: {
        total: number;
        perPage: number;
        currentPage: number;
        lastPage: number;
    };
    data: T[];
}

export interface VendorPricingCountry {
    name: string;
    code: string;
    packages: VendorPackage[];
}

export interface VendorBundle {
    id: string;
    package: string;
    initial_data_quantity?: number;
    initial_data_unit?: string;
    rem_data_quantity?: number;
    rem_data_unit?: string;
    date_created: string;
    date_activated?: string;
    date_expiry?: string;
    activated: boolean;
    status: string;
}

export interface VendorEsim {
    id: string;
    iccid: string;
    created_at: string;
    last_bundle: string;
    status: string;
    total_bundles: number;
    universal_link?: string;
}

export interface VendorEsimDetail {
    sim: {
        id: string;
        iccid: string;
        status: string;
        total_bundles: number;
    };
    in_use_packages: Array<{
        id: string;
        package: string;
        status: string;
    }>;
}

export interface VendorUsage {
    initial_data_quantity: number | string;
    initial_data_unit: string;
    rem_data_quantity: number | string;
    rem_data_unit: string;
}

export interface VendorPurchaseResult {
    sim_applied: boolean;
    sim?: {
        id: string;
        iccid: string;
        status: string;
    };
    message?: string;
}

export interface VendorAsyncPurchaseResult {
    sim_applied: boolean;
    sim_id: string;
    order_id: number;
}

export interface VendorVoiceSmsPurchaseResult {
    id: string;
    package: string;
    activated: boolean;
    status: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class EsimVendorService extends EventEmitter {
    private token: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        super();
    }

    // =========================================================================
    // AUTH
    // =========================================================================

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

            // Response: { status: true, access_token: "...", token_type: "Bearer", user: {...} }
            const accessToken = response.data?.access_token || response.data?.token;

            if (!accessToken) {
                console.error('Login Response:', response.data);
                throw new Error('No access token received from vendor login.');
            }

            this.token = accessToken;
            // Set expiry to 23h from now (token is valid for ~24h)
            this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

            console.log('✅ Vendor Login Successful');
            return this.token as string;
        } catch (error: any) {
            console.error('❌ Vendor Login Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Logout — invalidate the current token
     */
    async logout(): Promise<void> {
        if (!this.token) return;

        try {
            await axios.post(`${API_BASE_URL}/logout`, {}, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            console.log('✅ Vendor Logout Successful');
        } catch (error: any) {
            console.warn('⚠️ Vendor Logout Warning:', error.response?.data || error.message);
        } finally {
            this.token = null;
            this.tokenExpiry = null;
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
     * Make an authenticated GET request
     */
    private async authGet(path: string, params?: Record<string, any>): Promise<any> {
        const token = await this.getToken();
        const response = await axios.get(`${API_BASE_URL}${path}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            params,
            timeout: 20000
        });
        return response.data;
    }

    /**
     * Make an authenticated POST request
     */
    private async authPost(path: string, data?: Record<string, any>): Promise<any> {
        const token = await this.getToken();
        const response = await axios.post(`${API_BASE_URL}${path}`, data || {}, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 20000
        });
        return response.data;
    }

    // =========================================================================
    // BALANCE
    // =========================================================================

    /**
     * Fetch account balance from the vendor API
     */
    async getBalance(): Promise<number> {
        try {
            const data = await this.authGet('/balance');
            // Response: { status: true, balance: 0 }
            return data?.balance ?? 0;
        } catch (error: any) {
            console.error('❌ Vendor Balance Error:', error.response?.data || error.message);
            return 0; // Graceful fallback
        }
    }

    // =========================================================================
    // PACKAGES & PRICING
    // =========================================================================

    /**
     * Fetch all available packages (paginated — fetches all pages)
     */
    async getPackages(packageType: string = 'DATA-ONLY'): Promise<VendorPackage[]> {
        const token = await this.getToken();
        console.log('📡 Fetching ALL vendor packages...');

        let allPackages: VendorPackage[] = [];
        let page = 1;
        let hasMore = true;
        let lastPage = 1;

        try {
            // First request to discover total pages with a large per_page size
            console.log(`   Fetching page 1 with per_page=200 (discovery)...`);
            const firstResponse = await axios.get(`${API_BASE_URL}/packages?page=1&per_page=200&package_type=${packageType}`, {
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

            console.log(`   Total pages to fetch (200 records/page): ${lastPage}`);

            // Fetch remaining pages in small batches with retries
            const BATCH_SIZE = 3;

            const fetchPageWithRetry = async (p: number, retries = 3): Promise<VendorPackage[]> => {
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const res = await axios.get(`${API_BASE_URL}/packages?page=${p}&per_page=200&package_type=${packageType}`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            timeout: 20000
                        });
                        return res.data?.data || [];
                    } catch (err: any) {
                        if (attempt === retries) {
                            console.warn(`⚠️ Failed to fetch page ${p} after ${retries} attempts: ${err.message}`);
                            return [];
                        }
                        await new Promise(r => setTimeout(r, 1500 * attempt));
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
            console.error('❌ Vendor Packages Error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch pricing information (packages grouped by country)
     */
    async getPricing(): Promise<any> {
        console.log('📡 Fetching vendor pricing...');
        try {
            return await this.authGet('/pricing');
        } catch (error: any) {
            console.error('❌ Vendor Pricing Error:', error.message);
            throw error;
        }
    }

    /**
     * Get details for a specific package by ID (UUID)
     */
    async getPackageDetail(packageId: string): Promise<VendorPackageDetail> {
        console.log(`📡 Fetching package detail for: ${packageId}...`);
        try {
            const data = await this.authGet(`/package/detail/${packageId}`);
            return data?.data;
        } catch (error: any) {
            console.error('❌ Package Detail Error:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // COUNTRIES & CONTINENTS
    // =========================================================================

    /**
     * Get list of available countries where packages are available
     */
    async getCountries(): Promise<VendorCountry[]> {
        console.log('📡 Fetching vendor countries...');
        try {
            const data = await this.authGet('/packages/country');
            return data?.data || [];
        } catch (error: any) {
            console.error('❌ Vendor Countries Error:', error.message);
            throw error;
        }
    }

    /**
     * Get packages for a specific country
     */
    async getPackagesByCountry(countryId: number, packageType?: string): Promise<any> {
        console.log(`📡 Fetching packages for country ${countryId}...`);
        try {
            const params: Record<string, any> = {};
            if (packageType) params.package_type = packageType;
            return await this.authGet(`/packages/country/${countryId}`, params);
        } catch (error: any) {
            console.error('❌ Country Packages Error:', error.message);
            throw error;
        }
    }

    /**
     * Get list of available continents
     */
    async getContinents(): Promise<VendorContinent[]> {
        console.log('📡 Fetching vendor continents...');
        try {
            const data = await this.authGet('/packages/continent');
            return data?.data || [];
        } catch (error: any) {
            console.error('❌ Vendor Continents Error:', error.message);
            throw error;
        }
    }

    /**
     * Get packages for a specific continent
     */
    async getPackagesByContinent(continentId: number, packageType?: string): Promise<any> {
        console.log(`📡 Fetching packages for continent ${continentId}...`);
        try {
            const params: Record<string, any> = {};
            if (packageType) params.package_type = packageType;
            return await this.authGet(`/packages/continent/${continentId}`, params);
        } catch (error: any) {
            console.error('❌ Continent Packages Error:', error.message);
            throw error;
        }
    }

    /**
     * Get global packages
     */
    async getGlobalPackages(packageType: string = 'DATA-ONLY'): Promise<any> {
        console.log(`📡 Fetching global packages (${packageType})...`);
        try {
            return await this.authGet(`/packages/global/${packageType}`);
        } catch (error: any) {
            console.error('❌ Global Packages Error:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // PURCHASING
    // =========================================================================

    /**
     * Check if an eSIM can be topped up
     */
    async canTopupEsim(imei: string): Promise<boolean> {
        console.log(`📡 Checking topup availability for IMEI: ${imei}...`);
        try {
            const data = await this.authPost('/can-topup-esim', { imei });
            return data?.data?.topup_available ?? false;
        } catch (error: any) {
            console.error('❌ Topup Check Error:', error.message);
            throw error;
        }
    }

    /**
     * Purchase a data-only package
     */
    async purchasePackage(imei: string, packageTypeId: string): Promise<VendorPurchaseResult> {
        console.log(`📡 Purchasing package ${packageTypeId} for IMEI: ${imei}...`);
        try {
            const data = await this.authPost('/package/purchase', { imei, package_type_id: packageTypeId });
            return data?.data;
        } catch (error: any) {
            console.error('❌ Purchase Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Purchase a data + voice + SMS package
     */
    async purchaseDataVoiceSmsPackage(imei: string, packageTypeId: string): Promise<VendorVoiceSmsPurchaseResult> {
        console.log(`📡 Purchasing voice+SMS package ${packageTypeId} for IMEI: ${imei}...`);
        try {
            const data = await this.authPost('/package/date_voice_sms/purchase', { imei, package_type_id: packageTypeId });
            return data?.data;
        } catch (error: any) {
            console.error('❌ Voice+SMS Purchase Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Purchase a package asynchronously
     */
    async purchasePackageAsync(imei: string, packageTypeId: string): Promise<VendorAsyncPurchaseResult> {
        console.log(`📡 Async purchasing package ${packageTypeId} for IMEI: ${imei}...`);
        try {
            const data = await this.authPost('/package/purchase/async', { imei, package_type_id: packageTypeId });
            return data?.data;
        } catch (error: any) {
            console.error('❌ Async Purchase Error:', error.response?.data || error.message);
            throw error;
        }
    }

    // =========================================================================
    // MY BUNDLES & ESIMS
    // =========================================================================

    /**
     * Get list of purchased bundles
     */
    async getMyBundles(): Promise<any> {
        console.log('📡 Fetching my bundles...');
        try {
            return await this.authGet('/my-bundles');
        } catch (error: any) {
            console.error('❌ My Bundles Error:', error.message);
            throw error;
        }
    }

    /**
     * Get details of a specific bundle
     */
    async getBundleDetail(bundleId: string): Promise<any> {
        console.log(`📡 Fetching bundle detail: ${bundleId}...`);
        try {
            const data = await this.authGet(`/bundles/${bundleId}`);
            return data?.data;
        } catch (error: any) {
            console.error('❌ Bundle Detail Error:', error.message);
            throw error;
        }
    }

    /**
     * Get list of purchased eSIMs
     */
    async getMyEsims(): Promise<any> {
        console.log('📡 Fetching my eSIMs...');
        try {
            return await this.authGet('/my-esims');
        } catch (error: any) {
            console.error('❌ My eSIMs Error:', error.message);
            throw error;
        }
    }

    /**
     * Get details of a specific eSIM
     */
    async getEsimDetail(esimId: string): Promise<VendorEsimDetail> {
        console.log(`📡 Fetching eSIM detail: ${esimId}...`);
        try {
            const data = await this.authGet(`/my-esims/${esimId}`);
            return data?.data;
        } catch (error: any) {
            console.error('❌ eSIM Detail Error:', error.message);
            throw error;
        }
    }

    /**
     * Get eSIM usage by eSIM ID
     */
    async getEsimUsage(esimId: string): Promise<VendorUsage> {
        console.log(`📡 Fetching eSIM usage for: ${esimId}...`);
        try {
            const data = await this.authGet(`/my-sim/${esimId}/usage`);
            return data?.data;
        } catch (error: any) {
            console.error('❌ eSIM Usage Error:', error.message);
            throw error;
        }
    }

    /**
     * Get order details by order ID
     */
    async getOrderDetail(orderId: number): Promise<any> {
        console.log(`📡 Fetching order detail: ${orderId}...`);
        try {
            const data = await this.authGet(`/order/${orderId}`);
            return data?.data;
        } catch (error: any) {
            console.error('❌ Order Detail Error:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // NETWORK COVERAGE
    // =========================================================================

    /**
     * Get network coverage information
     */
    async getNetworkCoverages(): Promise<VendorCountryWithCoverage[]> {
        console.log('📡 Fetching network coverages...');
        try {
            const data = await this.authGet('/network-coverages');
            return data?.data || [];
        } catch (error: any) {
            console.error('❌ Network Coverage Error:', error.message);
            throw error;
        }
    }

    // =========================================================================
    // LEGACY COMPATIBILITY — Used by existing server.ts routes
    // =========================================================================

    /**
     * Fetch eSIM details and usage by ICCID from the vendor API
     * Used by: /api/esim/usage/:iccid, /api/partner/activations, /api/esim/usage/batch
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
