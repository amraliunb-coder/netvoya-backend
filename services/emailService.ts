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

interface AssignmentDetails {
    email: string;
    name: string;
    iccid: string;
    activationCode: string;
    qrCodeUrl: string;
    packageName: string;
    region: string;
    dataLimit: number;
    durationDays: number;
}

export const sendEsimAssignmentEmail = async (details: AssignmentDetails) => {
    try {
        const { email, name, iccid, activationCode, qrCodeUrl, packageName, region, dataLimit, durationDays } = details;

        console.log(`📧 Sending eSIM assignment email to ${email}...`);

        const installInstructions = `1. Go to Settings > Cellular/Mobile Data > Add eSIM.\n2. Scan the QR code below.\n3. Label your new plan as "Travel" or "${region}".\n4. Default Line: Primary (Home).\n5. Mobile Data: ${region} (Travel).\n6. Turn on "Data Roaming" for the new eSIM.`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fafafa;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/drzid08rg/image/upload/v1770202654/ChatGPT_Image_Feb_3_2026_04_46_05_PM_obgtc3.png" alt="NetVoya Logo" style="height: 120px; margin-bottom: 15px;" />
                    <h2 style="color: #F97316; margin: 0;">NetVoya eSIM Assigned</h2>
                    <p style="color: #666; font-size: 14px; margin-top: 5px;">Your digital connectivity is ready.</p>
                </div>

                <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #444; line-height: 1.5;">You have been assigned a new Global eSIM profile by your administrator. Please install it before your trip.</p>

                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #166534; margin-top: 0; font-size: 16px;">📦 Plan Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; color: #15803d; font-size: 14px;">
                            <li style="margin-bottom: 5px;">📍 <strong>Region:</strong> ${region}</li>
                            <li style="margin-bottom: 5px;">📊 <strong>Data:</strong> ${dataLimit} GB</li>
                            <li style="margin-bottom: 5px;">⏳ <strong>Duration:</strong> ${durationDays} Days</li>
                            <li>🆔 <strong>ICCID:</strong> <span style="font-family: monospace;">${iccid}</span></li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <p style="font-weight: bold; margin-bottom: 10px;">Scan to Activate:</p>
                        <img src="${qrCodeUrl}" alt="eSIM QR Code" style="width: 200px; height: 200px; border: 5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 10px;" />
                        <p style="font-size: 12px; color: #888; margin-top: 10px;">(Scan this with your phone camera or inside Settings)</p>
                    </div>

                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">Manual Activation Code:</p>
                        <code style="display: block; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; color: #1e3a8a;">${activationCode}</code>
                        <p style="font-size: 11px; color: #60a5fa; margin-top: 5px;">Use this if you cannot scan the QR code.</p>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 15px;">
                        <h4 style="margin-top: 0; font-size: 14px; color: #333;">Quick Setup Instructions:</h4>
                        <ol style="font-size: 13px; color: #555; padding-left: 20px; line-height: 1.6;">
                            <li>Go to <strong>Settings > Cellular/Mobile Data</strong>.</li>
                            <li>Tap <strong>Add eSIM</strong> or <strong>Add Data Plan</strong>.</li>
                            <li>Scan the QR code above.</li>
                            <li>Label this plan as <strong>"Travel - ${region}"</strong>.</li>
                            <li><strong>Important:</strong> Turn on "Data Roaming" for this new eSIM line.</li>
                        </ol>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                    <p>Contact your admin if you have trouble installing.</p>
                    <p>&copy; ${new Date().getFullYear()} NetVoya. All rights reserved.</p>
                </div>
            </div>
        `;

        // Send mail
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <admin@netvoya.com>',
            to: email,
            subject: `📲 Your NetVoya eSIM is Ready: ${packageName}`,
            text: `Hello ${name}. Here is your eSIM for ${region}. Manual Code: ${activationCode}. \n\n${installInstructions}`,
            html: htmlContent,
        });

        console.log("✅ Assignment email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error: any) {
        console.error("❌ Error sending assignment email:", error);
        return { success: false, error: error.message };
    }
};

export default { sendInventoryRequestEmail, sendEsimAssignmentEmail };
