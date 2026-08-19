import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(to: string, otp: string, purpose: 'verification' | 'password_reset') {
  const subject =
    purpose === 'password_reset' ? 'Your Password Reset OTP' : 'Verify Your Email';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>${purpose === 'password_reset' ? 'Reset Your Password' : 'Email Verification'}</h2>
      <p>Use the OTP below. It expires in ${purpose === 'password_reset' ? '15' : '10'} minutes.</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">${otp}</div>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

/**
 * Order confirmation email — the same mail the customer website sends
 * (website-customer/backend/utils/mailer.js). Keep the two templates in step.
 * `order` = { orderNumber, deliveryType, paymentMethod, subtotal, deliveryFee,
 *             discount, total, items: [{ name, quantity, price, image }],
 *             shippingAddress: { name, line1, line2, city, state, pincode } }
 */
export async function sendOrderConfirmationEmail(
  toEmail: string,
  order: {
    orderNumber: string;
    deliveryType?: string;
    paymentMethod?: string;
    subtotal: number;
    deliveryFee?: number;
    discount?: number;
    total: number;
    items?: { name: string; quantity: number; price: number; image?: string }[];
    shippingAddress?: {
      name?: string; line1?: string; line2?: string;
      city?: string; state?: string; pincode?: string;
    } | null;
  }
): Promise<void> {
  const {
    orderNumber, deliveryType, paymentMethod, subtotal,
    deliveryFee = 0, discount = 0, total, items = [], shippingAddress,
  } = order;

  // Deep link to THIS order, not the order list. `/orders` is not a route on the
  // customer site at all, so a button pointing at it does nothing when tapped —
  // `/order-tracking/:orderNumber` is the route Profile.jsx itself navigates to.
  // encodeURIComponent because the number lands in the path.
  const trackUrl = `${(process.env.WEB_BASE_URL || 'https://zpinservices.com').replace(/\/+$/, '')}/order-tracking/${encodeURIComponent(orderNumber)}`;

  const fmt = (n: number) => `Rs. ${Number(n || 0).toFixed(2)}`;
  const esc = (s: any) => String(s ?? '').replace(/[<>&"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:56px">
        <img src="${esc(item.image || '')}" alt="${esc(item.name)}" width="48" height="48"
          style="width:48px;height:48px;border-radius:8px;object-fit:cover;background:#f1f5f9;display:block" />
      </td>
      <td style="padding:14px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top">
        <div style="font-size:14px;color:#1a1a1a;font-weight:600">${esc(item.name)}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">Qty: ${esc(item.quantity)}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;text-align:right;white-space:nowrap">
        <span style="font-size:14px;color:#1a1a1a;font-weight:600">${fmt(item.price * item.quantity)}</span>
      </td>
    </tr>
  `).join('');

  const addressBlock = shippingAddress ? `
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">
      ${shippingAddress.name ? `${esc(shippingAddress.name)}<br/>` : ''}
      ${[shippingAddress.line1, shippingAddress.line2].filter(Boolean).map(esc).join(', ')}<br/>
      ${[shippingAddress.city, shippingAddress.state, shippingAddress.pincode].filter(Boolean).map(esc).join(' ')}<br/>
      India
    </p>
  ` : '<p style="margin:0;font-size:13px;color:#94a3b8">Not available</p>';

  const deliveryLabel = deliveryType === 'flash'
    ? 'Instant Delivery — arrives within 12 hours, try at your door'
    : 'Standard Delivery — arrives within 12 hours, 7-day returns';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: `Order ${orderNumber} confirmed`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#fff;color:#1a1a1a">
        <div style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:24px;font-weight:900;letter-spacing:-0.02em;color:#1a1a1a">ZPIN</span>
          <span style="font-size:12px;color:#94a3b8;letter-spacing:0.05em">ORDER ${esc(orderNumber)}</span>
        </div>

        <div style="padding:28px 32px 8px">
          <h1 style="font-size:20px;margin:0 0 8px">Thank you for your purchase!</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.6">
            We're getting your order ready. ${deliveryLabel}.
          </p>
          <a href="${esc(trackUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">
            View your order
          </a>
        </div>

        <div style="padding:24px 32px 8px">
          <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 12px">Order summary</h2>
          <table style="width:100%;border-collapse:collapse">
            ${itemRows}
          </table>
          <table style="width:100%;border-collapse:collapse;margin-top:12px">
            <tr><td style="padding:4px 0;font-size:13px;color:#64748b">Subtotal</td><td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right">${fmt(subtotal)}</td></tr>
            ${discount > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#16a34a">Discount</td><td style="padding:4px 0;font-size:13px;color:#16a34a;text-align:right">-${fmt(discount)}</td></tr>` : ''}
            <tr><td style="padding:4px 0;font-size:13px;color:#64748b">Delivery fee</td><td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right">${fmt(deliveryFee)}</td></tr>
            <tr>
              <td style="padding:12px 0 4px;font-size:15px;font-weight:800;border-top:1px solid #f1f5f9">Total</td>
              <td style="padding:12px 0 4px;font-size:15px;font-weight:800;border-top:1px solid #f1f5f9;text-align:right">${fmt(total)}</td>
            </tr>
          </table>
        </div>

        <div style="padding:8px 32px 28px">
          <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:16px 0 8px">Shipping address</h2>
          ${addressBlock}

          <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:16px 0 8px">Payment</h2>
          <p style="margin:0;font-size:13px;color:#475569">${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</p>

          <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:16px 0 8px">Delivery method</h2>
          <p style="margin:0;font-size:13px;color:#475569">${deliveryType === 'flash' ? 'Instant Delivery' : 'Standard Delivery'}</p>
        </div>

        <div style="padding:20px 32px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="font-size:12px;color:#94a3b8;margin:0">Questions about your order? Contact us at support@zpin.in</p>
        </div>
      </div>
    `,
  });
}
