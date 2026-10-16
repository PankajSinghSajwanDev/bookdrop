import { Resend } from 'resend';
import { env } from './env.server';

const resend = new Resend(env.RESEND_API_KEY);

interface DeliveryEmailProps {
  to: string;
  orderId: string;
  bookTitle: string;
  downloadUrl: string;
}

export async function sendDeliveryEmail({ to, orderId, bookTitle, downloadUrl }: DeliveryEmailProps) {
  if (env.RESEND_API_KEY === "re_dummy_key_123456789") {
    console.log(`[Resend Mock] Sending email to ${to} for order ${orderId}`);
    return { id: `mock_resend_${Date.now()}` };
  }

  try {
    const data = await resend.emails.send({
      from: 'BookDrop Delivery <delivery@yourdomain.com>',
      to: [to],
      subject: `Your eBook Download - ${bookTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Thank you for your order!</h2>
          <p>Order #${orderId}</p>
          <p>Your digital copy of <strong>${bookTitle}</strong> is ready to download.</p>
          <div style="margin: 30px 0;">
            <a href="${downloadUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Download eBook
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link is unique to you. For PDFs, your email address is automatically watermarked onto the file to protect the author's copyright.
          </p>
        </div>
      `,
    });
    
    return data;
  } catch (error) {
    console.error("Resend Email Error:", error);
    throw error;
  }
}
