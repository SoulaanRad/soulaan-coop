import nodemailer from 'nodemailer';

// Email configuration from environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport(emailConfig);

/**
 * Send a login code email
 */
export async function sendLoginCode(email: string, code: string): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@soulaan.coop',
    to: email,
    subject: 'Your Soulaan Co-op Login Code',
    text: `Your login code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B6F47;">Soulaan Co-op</h2>
        <p>Your login code is:</p>
        <h1 style="color: #8B6F47; font-size: 32px; letter-spacing: 5px; text-align: center; background: #F5F5DC; padding: 20px; border-radius: 8px;">
          ${code}
        </h1>
        <p style="color: #666;">This code expires in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send login code email');
  }
}

/**
 * Generate a random 6-digit code
 */
export function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if email configuration is valid
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}
