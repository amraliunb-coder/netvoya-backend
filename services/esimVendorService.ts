import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://api.esimcard.com/v1'; // Placeholder URL

export interface VendorAuthResponse {
    token: string;
    expires_at: string;
}

export interface VendorPackage {
    id: string;
    name: string;
    region: string;
    data_limit_gb: number;
    duration_days: number;
    price: number;
}

class EsimVendorService {
    private token: string | null = null;

    /**
     * Authenticate with the eSIMCard.com API
     */
    async login(): Promise<string> {
        const email = process.env.ESIM_CARD_VENDOR_EMAIL;
        const password = process.env.ESIM_CARD_VENDOR_PASSWORD;

        if (!email || !password || email.includes('example.com')) {
            throw new Error('Vendor credentials not configured or using placeholders.');
        }

        try {
            // Real implementation would call something like:
            // const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
            // this.token = response.data.token;

            console.log('📡 Mocking login for eSIMCard.com API...');
            this.token = 'mock-vendor-token-' + Date.now();
            return this.token;
        } catch (error: any) {
            console.error('❌ Vendor Login Error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch all available packages from the vendor
     */
    async getPackages(): Promise<VendorPackage[]> {
        if (!this.token) {
            await this.login();
        }

        try {
            // Real implementation:
            // const response = await axios.get(`${API_BASE_URL}/packages`, {
            //   headers: { Authorization: `Bearer ${this.token}` }
            // });
            // return response.data.packages;

            console.log('📡 Mocking package fetch from eSIMCard.com API...');
            return [
                { id: 'pkg_1', name: 'Global 1GB', region: 'Global', data_limit_gb: 1, duration_days: 7, price: 5.00 },
                { id: 'pkg_2', name: 'Europe 5GB', region: 'Europe', data_limit_gb: 5, duration_days: 30, price: 12.00 },
                { id: 'pkg_3', name: 'USA 10GB', region: 'USA', data_limit_gb: 10, duration_days: 30, price: 20.00 }
            ];
        } catch (error: any) {
            console.error('❌ Vendor Fetch Packages Error:', error.message);
            throw error;
        }
    }

    /**
     * Fetch current balance from the vendor
     */
    async getBalance(): Promise<number> {
        if (!this.token) {
            await this.login();
        }

        try {
            // Real implementation:
            // const response = await axios.get(`${API_BASE_URL}/balance`, {
            //   headers: { Authorization: `Bearer ${this.token}` }
            // });
            // return response.data.balance;

            console.log('📡 Mocking balance fetch from eSIMCard.com API...');
            // Simulate real-time balance for testing ($8 to trigger warning)
            return 8.50;
        } catch (error: any) {
            console.error('❌ Vendor Fetch Balance Error:', error.message);
            throw error;
        }
    }
}

export default new EsimVendorService();
