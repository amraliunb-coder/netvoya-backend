import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface PackageItem {
    name: string;
    region: string;
    quantity: number;
    price: number;
    total: number;
}

interface RequestDetails {
    totalTokens: number;
    totalAmount: number;
    discountLabel?: string;
    packages: PackageItem[];
    partnerInfo?: {
        name?: string;
        email?: string;
        role?: string;
    };
}

export const sendInventoryRequestEmail = async (details: RequestDetails) => {
    try {
        const { totalTokens, totalAmount, discountLabel, packages, partnerInfo } = details;

        // Target email
        const targetEmail = process.env.ADMIN_EMAIL || 'amr.ali.mme@gmail.com';

        console.log(`📧 Sending inventory request email to ${targetEmail}...`);

        // Generate HTML Table for Packages
        const rows = packages.map(pkg => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pkg.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pkg.region}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${pkg.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${pkg.price.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${pkg.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #F97316; margin-top: 0;">New Inventory Request</h2>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Submitter:</strong> ${partnerInfo?.name || 'Partner Account'} (${partnerInfo?.email || 'Unknown Email'})</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> ${partnerInfo?.role || 'Partner'}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Package</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Region</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Rate</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total Tokens:</td>
                            <td style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">${totalTokens}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Total Amount:</td>
                            <td style="padding: 10px; text-align: right; font-weight: bold; color: #F97316; font-size: 16px;">$${totalAmount.toLocaleString()}</td>
                        </tr>
                        ${discountLabel ? `
                        <tr>
                            <td colspan="5" style="padding: 10px; text-align: right; color: #10B981; font-weight: bold;">
                                ✅ ${discountLabel} Volume Discount Applied
                            </td>
                        </tr>
                        ` : ''}
                    </tfoot>
                </table>

                <div style="font-size: 12px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                    Sent automatically by NetVoya Partner Portal
                </div>
            </div>
        `;

        // Send mail with defined transport object
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <admin@netvoya.com>', // sender address
            to: targetEmail, // list of receivers
            subject: `📦 New Inventory Request: ${totalTokens} Tokens - $${totalAmount}`, // Subject line
            text: `New Inventory Request from ${partnerInfo?.name || 'Partner'}. Total Tokens: ${totalTokens}. Total Amount: $${totalAmount}. Please check the dashboard for details.`, // plain text body
            html: htmlContent, // html body
        });

        console.log("✅ Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error: any) {
        console.error("❌ Error sending email:", error);
        // Don't throw, just return failure so we don't block the API response
        return { success: false, error: error.message };
    }
};

export default { sendInventoryRequestEmail };
