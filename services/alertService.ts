import EsimProfile from '../models/EsimProfile.js';
import InventoryBucket from '../models/InventoryBucket.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendLowDataAlertEmail, sendLowBalanceAlertEmail } from './emailService.js';

// Basic in-memory cache for admin alerts rate limiting
let lastBalanceAlertSent = 0;
const BALANCE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Loosely parse simple data strings (e.g. "1 GB", "250 MB") into Megabytes
 */
export const parseDataCapacityToMB = (str: string): number => {
    if (!str) return 0;
    const num = parseFloat(str) || 0;
    if (str.toUpperCase().includes('GB')) return num * 1024;
    if (str.toUpperCase().includes('MB')) return num;
    return num;
};

/**
 * Checks if an eSIM's remaining data is <= 20% of its initial data.
 * If yes, dispatches email and DB warning alerts once.
 */
export const checkEsimLowDataAlert = async (profileIdOrIccid: string, balance: { initial_data: string | null; remaining_data: string | null } | null) => {
    if (!balance || !balance.initial_data || !balance.remaining_data) return;

    try {
        const initialMB = parseDataCapacityToMB(balance.initial_data);
        const remainingMB = parseDataCapacityToMB(balance.remaining_data);

        if (initialMB <= 0) return;

        const ratio = remainingMB / initialMB;

        // Trigger warning if remaining data drops to <= 20%
        if (ratio <= 0.20) {
            // Find eSIM Profile in DB (either by ObjectId or ICCID)
            let profile;
            if (profileIdOrIccid.length === 24) {
                profile = await EsimProfile.findById(profileIdOrIccid);
            } else {
                profile = await EsimProfile.findOne({ iccid: profileIdOrIccid });
            }
            if (!profile) return;

            // Check if alert already sent
            if (profile.low_data_alert_sent) return;

            console.log(`⚠️ TRIGGERED: Low data alert for ICCID ${profile.iccid}. Remaining: ${balance.remaining_data} of ${balance.initial_data} (${(ratio * 100).toFixed(0)}%)`);

            // Mark as sent immediately to avoid race conditions or dual alerts
            profile.low_data_alert_sent = true;
            profile.low_data_alert_sent_at = new Date();
            await profile.save();

            // 1. Send Email Alert to End-User (B2C)
            if (profile.assigned_to_email) {
                const userEmail = profile.assigned_to_email;
                const userName = profile.assigned_to_name || 'NetVoya Customer';
                
                // Get bucket details for region
                let region = 'Global';
                const bucket = await InventoryBucket.findById(profile.bucket_id);
                if (bucket) {
                    region = bucket.region || 'Global';
                }

                await sendLowDataAlertEmail({
                    email: userEmail,
                    name: userName,
                    iccid: profile.iccid,
                    remaining: balance.remaining_data,
                    initial: balance.initial_data,
                    region
                });
            }

            // 2. Create In-App Warning Notification for Partner (B2B)
            const bucket = await InventoryBucket.findById(profile.bucket_id);
            if (bucket && bucket.partner_id) {
                const partnerId = bucket.partner_id;
                const clientName = profile.assigned_to_name || 'Assigned User';
                
                await Notification.create({
                    userId: partnerId,
                    title: 'eSIM Low Data Alert',
                    message: `eSIM profile for ${clientName} (ICCID: ${profile.iccid}) is running low on data. Only ${balance.remaining_data} remains of the initial ${balance.initial_data}.`,
                    type: 'warning',
                    isRead: false
                });

                console.log(`✅ In-app warning notification saved for Partner: ${partnerId}`);
            }
        }
    } catch (err: any) {
        console.error('❌ Error processing eSIM low data alert:', err.message);
    }
};

/**
 * Checks if the eSIM developer balance is <= $20.00.
 * If yes, dispatches email and DB warning alerts once every 6 hours.
 */
export const checkVendorBalanceAlert = async (balance: number) => {
    try {
        if (balance > 20) return;

        const now = Date.now();
        if (now - lastBalanceAlertSent < BALANCE_ALERT_COOLDOWN_MS) {
            return; // Cooldown active, don't spam emails
        }

        console.log(`🛑 TRIGGERED: Low vendor balance alert ($${balance.toFixed(2)} USD <= $20.00 USD)`);
        lastBalanceAlertSent = now;

        // 1. Send Email Alert to Netvoya Admin
        const adminEmail = process.env.ADMIN_EMAIL || 'hello@netvoya.com';
        await sendLowBalanceAlertEmail({
            email: adminEmail,
            balance
        });

        // 2. Find Admin users in DB to create in-app alerts
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
            for (const admin of admins) {
                await Notification.create({
                    userId: admin._id,
                    title: 'Vendor Balance Low',
                    message: `CRITICAL: Your portal.esimcard.com developer account balance is running dangerously low ($${balance.toFixed(2)} USD). Replenish your funds to avoid eSIM order failures.`,
                    type: 'error',
                    isRead: false
                });
            }
            console.log(`✅ In-app error alerts created for ${admins.length} Admins.`);
        }
    } catch (err: any) {
        console.error('❌ Error processing low balance alert:', err.message);
    }
};

export default {
    parseDataCapacityToMB,
    checkEsimLowDataAlert,
    checkVendorBalanceAlert
};
