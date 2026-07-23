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

const formatEmailError = (error: any): string => {
    const msg = error?.message || String(error);
    if (msg.includes('535') || msg.includes('Authentication unsuccessful') || error?.code === 'EAUTH') {
        return `SMTP Authentication failed. Please verify that SMTP_USER and SMTP_PASS are correct. If you are using Microsoft 365 (Office 365), make sure "Authenticated SMTP" is enabled for the hello@netvoya.com mailbox in the Microsoft 365 Admin Center (Users > Active Users > Mail tab > Manage email apps > enable Authenticated SMTP). If Multi-Factor Authentication (MFA) is enabled, you must generate and use an App Password instead.`;
    }
    return msg;
};

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
        const targetEmail = process.env.ADMIN_EMAIL || 'hello@netvoya.com';

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
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <hello@netvoya.com>', // sender address
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
        return { success: false, error: formatEmailError(error) };
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
    cc?: string; // Optional override; falls back to ESIM_AUDIT_CC_EMAIL env var
}

export const sendEsimAssignmentEmail = async (details: AssignmentDetails) => {
    try {
        const { email, name, iccid, activationCode, qrCodeUrl, packageName, region, dataLimit, durationDays, cc } = details;
        const auditCc = cc || process.env.ESIM_AUDIT_CC_EMAIL;

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
        const mailOptions: any = {
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <hello@netvoya.com>',
            to: email,
            subject: `📲 Your NetVoya eSIM is Ready: ${packageName}`,
            text: `Hello ${name}. Here is your eSIM for ${region}. Manual Code: ${activationCode}. \n\n${installInstructions}`,
            html: htmlContent,
        };

        if (auditCc) {
            mailOptions.cc = auditCc;
            console.log(`📋 CC audit copy will be sent to: ${auditCc}`);
        }

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Assignment email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error: any) {
        console.error("❌ Error sending assignment email:", error);
        return { success: false, error: formatEmailError(error) };
    }
};

export const sendLowDataAlertEmail = async (details: {
    email: string;
    name: string;
    iccid: string;
    remaining: string;
    initial: string;
    region: string;
}) => {
    try {
        const { email, name, iccid, remaining, initial, region } = details;
        console.log(`📧 Sending low data alert email to ${email}...`);

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fafafa;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/drzid08rg/image/upload/v1770202654/ChatGPT_Image_Feb_3_2026_04_46_05_PM_obgtc3.png" alt="NetVoya Logo" style="height: 120px; margin-bottom: 15px;" />
                    <h2 style="color: #EA580C; margin: 0;">⚠️ Low Data Alert</h2>
                    <p style="color: #666; font-size: 14px; margin-top: 5px;">Your NetVoya eSIM data plan is running low.</p>
                </div>

                <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #444; line-height: 1.5;">This is an automated alert to notify you that your eSIM data plan for <strong>${region}</strong> is running low on data. Please see details below:</p>

                    <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #b45309; margin-top: 0; font-size: 16px;">📊 Current Data Status</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; color: #92400e; font-size: 14px;">
                            <li style="margin-bottom: 5px;">📍 <strong>Region:</strong> ${region}</li>
                            <li style="margin-bottom: 5px;">📉 <strong>Remaining Data:</strong> <span style="font-size: 16px; font-weight: bold; color: #EA580C;">${remaining}</span> left</li>
                            <li style="margin-bottom: 5px;">📦 <strong>Initial Allowance:</strong> ${initial}</li>
                            <li>🆔 <strong>ICCID:</strong> <span style="font-family: monospace;">${iccid}</span></li>
                        </ul>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px;">
                        <h4 style="margin-top: 0; font-size: 14px; color: #333;">Need a top-up?</h4>
                        <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0;">
                            If you need additional data for your trip, please contact your company administrator or support agent to request a data top-up for your eSIM.
                        </p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                    <p>Sent automatically by NetVoya Alerts System</p>
                    <p>&copy; ${new Date().getFullYear()} NetVoya. All rights reserved.</p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <hello@netvoya.com>',
            to: email,
            subject: `⚠️ Low Data Warning: Your eSIM has ${remaining} remaining`,
            text: `Hello ${name}. Your eSIM for ${region} is running low on data. Only ${remaining} of ${initial} remains. Please contact your administrator for a top-up.`,
            html: htmlContent,
        });

        console.log("✅ Low data email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("❌ Error sending low data email:", error);
        return { success: false, error: formatEmailError(error) };
    }
};

export const sendLowBalanceAlertEmail = async (details: {
    email: string;
    balance: number;
}) => {
    try {
        const { email, balance } = details;
        console.log(`📧 Sending low balance alert email to admin: ${email}...`);

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fafafa;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/drzid08rg/image/upload/v1770202654/ChatGPT_Image_Feb_3_2026_04_46_05_PM_obgtc3.png" alt="NetVoya Logo" style="height: 120px; margin-bottom: 15px;" />
                    <h2 style="color: #DC2626; margin: 0;">🛑 CRITICAL: Low Vendor Balance</h2>
                    <p style="color: #666; font-size: 14px; margin-top: 5px;">Your eSIM vendor account balance is running dangerously low.</p>
                </div>

                <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px;">Hello NetVoya Admin,</p>
                    <p style="color: #444; line-height: 1.5;">This is an automated alert indicating that your developer balance at <strong>portal.esimcard.com</strong> is below the critical threshold of <strong>$20.00 USD</strong>.</p>

                    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 14px; color: #991b1b; text-transform: uppercase; font-weight: bold; font-family: sans-serif; display: block; margin-bottom: 5px;">Current Balance</span>
                        <span style="font-size: 32px; font-weight: bold; color: #DC2626; font-family: monospace;">$${balance.toFixed(2)} USD</span>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px;">
                        <h4 style="margin-top: 0; font-size: 14px; color: #333; text-transform: uppercase;">⚠️ Action Required</h4>
                        <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0;">
                            Please log in to your developer portal at <a href="https://portal.esimcard.com" target="_blank" style="color: #2563EB; font-weight: bold;">portal.esimcard.com</a> and replenish your account balance immediately. Failing to do so will cause automated customer eSIM purchases and manual activations to fail with VENDOR ERROR codes.
                        </p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                    <p>Sent automatically by NetVoya Platform Alerts</p>
                    <p>&copy; ${new Date().getFullYear()} NetVoya. All rights reserved.</p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya Admin" <hello@netvoya.com>',
            to: email,
            subject: `🛑 URGENT ALERT: Low eSIM Vendor Balance - $${balance.toFixed(2)}`,
            text: `CRITICAL: Your eSIM vendor account balance is low. Current Balance: $${balance.toFixed(2)} USD. Please top up portal.esimcard.com immediately to avoid purchase failures.`,
            html: htmlContent,
        });

        console.log("✅ Low balance email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("❌ Error sending low balance email:", error);
        return { success: false, error: formatEmailError(error) };
    }
};

export interface ClientRequestDetails {
    totalTokens: number;
    totalAmount: number;
    discountLabel?: string;
    packages: {
        name: string;
        region: string;
        quantity: number;
        price: number;
        total: number;
    }[];
    clientInfo: {
        name?: string;
        email: string;
        phone?: string;
    };
    agencyInfo?: {
        name?: string;
        email?: string;
        id?: string;
    };
}

export const sendClientConfirmationEmail = async (details: ClientRequestDetails) => {
    try {
        const { totalTokens, totalAmount, discountLabel, packages, clientInfo, agencyInfo } = details;
        console.log(`📧 Sending client confirmation email to ${clientInfo.email}...`);

        const rows = packages.map(pkg => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 500;">${pkg.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${pkg.region}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${pkg.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #666;">$${pkg.price.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #0EA5E9;">$${pkg.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 25px;">
                    <img src="https://res.cloudinary.com/drzid08rg/image/upload/d91fcd24-8cf6-4adf-b9df-7312622185a8_ihpxqo.png" alt="NetVoya Logo" style="height: 60px; margin-bottom: 10px;" />
                    <h2 style="color: #0EA5E9; margin: 0; font-size: 22px;">eSIM Request Confirmation</h2>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Thank you for your order via ${agencyInfo?.name || 'our Partner Agency'}!</p>
                </div>

                <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0EA5E9;">
                    <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Client Name:</strong> ${clientInfo.name || 'Customer'}</p>
                    <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Client Email:</strong> ${clientInfo.email}</p>
                    <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Partner Agency:</strong> ${agencyInfo?.name || 'NetVoya Partner'} (${agencyInfo?.email || 'N/A'})</p>
                    <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 10px;">Requested eSIM Packages</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="padding: 10px; text-align: left; color: #475569;">Package</th>
                            <th style="padding: 10px; text-align: left; color: #475569;">Region</th>
                            <th style="padding: 10px; text-align: center; color: #475569;">Tokens</th>
                            <th style="padding: 10px; text-align: right; color: #475569;">Rate</th>
                            <th style="padding: 10px; text-align: right; color: #475569;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="padding: 12px 10px; text-align: right; font-weight: bold; border-top: 2px solid #e2e8f0; color: #334155;">Total Tokens:</td>
                            <td style="padding: 12px 10px; text-align: right; font-weight: bold; border-top: 2px solid #e2e8f0; color: #334155;">${totalTokens}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="padding: 8px 10px; text-align: right; font-weight: bold; color: #334155;">Total Amount:</td>
                            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #0EA5E9; font-size: 18px;">$${totalAmount.toFixed(2)} USD</td>
                        </tr>
                        ${discountLabel ? `
                        <tr>
                            <td colspan="5" style="padding: 8px 10px; text-align: right; color: #10B981; font-weight: bold;">
                                🎁 Special Affiliate Discount Applied (${discountLabel})
                            </td>
                        </tr>
                        ` : ''}
                    </tfoot>
                </table>

                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 500;">
                        ⏱️ Request Received & Processing
                    </p>
                    <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 13px;">
                        Our team is preparing your requested eSIM tokens. Your QR codes and activation profiles will be delivered to your email shortly.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    <p>&copy; ${new Date().getFullYear()} NetVoya. All rights reserved.</p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya" <hello@netvoya.com>',
            to: clientInfo.email,
            subject: `eSIM Package Request Received - ${totalTokens} Tokens`,
            text: `Hello ${clientInfo.name || 'Customer'}, we received your request for ${totalTokens} eSIM tokens ($${totalAmount.toFixed(2)} USD) via ${agencyInfo?.name || 'Partner Agency'}. Our team is processing your request.`,
            html: htmlContent,
        });

        console.log("✅ Client confirmation email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("❌ Error sending client confirmation email:", error);
        return { success: false, error: formatEmailError(error) };
    }
};

export const sendAdminClientRequestEmail = async (details: ClientRequestDetails) => {
    try {
        const { totalTokens, totalAmount, discountLabel, packages, clientInfo, agencyInfo } = details;
        const targetEmail = process.env.ADMIN_EMAIL || 'hello@netvoya.com';
        console.log(`📧 Sending admin notification for client request to ${targetEmail}...`);

        const rows = packages.map(pkg => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pkg.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${pkg.region}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${pkg.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${pkg.price.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">$${pkg.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #F97316; margin-top: 0;">🚀 New B2C Client Request (Affiliate Link)</h2>
                
                <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Client Name:</strong> ${clientInfo.name || 'Client'}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Client Email:</strong> ${clientInfo.email}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Client Phone:</strong> ${clientInfo.phone || 'N/A'}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Referred Agency:</strong> ${agencyInfo?.name || 'Direct Partner'} (${agencyInfo?.email || 'N/A'})</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <h3 style="margin-bottom: 10px; font-size: 15px;">Requested Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 8px; text-align: left;">Package</th>
                            <th style="padding: 8px; text-align: left;">Region</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Rate</th>
                            <th style="padding: 8px; text-align: right;">Total</th>
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
                            <td colspan="4" style="padding: 8px; text-align: right; font-weight: bold;">Total Amount:</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: #F97316; font-size: 16px;">$${totalAmount.toFixed(2)} USD</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; text-align: center;">
                    <p style="margin: 0; color: #166534; font-size: 13px; font-weight: bold;">
                        ⚡ Action Required: Issue/Fulfill Tokens in Admin Dashboard
                    </p>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"NetVoya System" <hello@netvoya.com>',
            to: targetEmail,
            subject: `🚀 New B2C Client Request - ${totalTokens} Tokens ($${totalAmount.toFixed(2)})`,
            text: `New B2C Client Request: ${clientInfo.name} (${clientInfo.email}) via Agency ${agencyInfo?.name}. Total Tokens: ${totalTokens}, Total: $${totalAmount.toFixed(2)}.`,
            html: htmlContent,
        });

        console.log("✅ Admin notification email sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("❌ Error sending admin client request email:", error);
        return { success: false, error: formatEmailError(error) };
    }
};

export default { 
    sendInventoryRequestEmail, 
    sendEsimAssignmentEmail,
    sendLowDataAlertEmail,
    sendLowBalanceAlertEmail,
    sendClientConfirmationEmail,
    sendAdminClientRequestEmail
};
