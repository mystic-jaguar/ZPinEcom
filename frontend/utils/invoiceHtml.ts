/**
 * Invoice HTML for the order "Invoice" button.
 *
 * The layout is a direct port of the customer website's jsPDF invoice
 * (website-customer/src/utils/invoice.js) — same A4 page, same sections in the
 * same order, same wording — so a customer gets an identical document whether
 * they download it from the site or the app. Rendered in a WebView for the
 * preview and handed to expo-print unchanged for the PDF, so preview and
 * download can never drift apart.
 */

export interface InvoiceData {
    orderNumber: string;
    createdAt?: string;
    paymentMethod?: string;
    shippingAddress?: any;
    items: { productName: string; quantity: number; price: number; total?: number }[];
    deliveryFee: number;
    taxAmount: number;
    totalAmount: number;
}

const fmt = (n: number) =>
    `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const day = (d: Date) => d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

// Invoices are built from server data, but the address and product names are
// user-authored — escape everything that reaches the document.
const esc = (v: any) =>
    String(v ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function invoiceFileName(orderNumber: string) {
    return `Invoice-${String(orderNumber).replace(/[^A-Za-z0-9._-]/g, '')}`;
}

export function buildInvoiceHtml(order: InvoiceData, customerEmail?: string): string {
    let addr = order.shippingAddress;
    if (typeof addr === 'string') {
        try { addr = JSON.parse(addr); } catch { addr = null; }
    }

    const addrLines: string[] = [];
    if (addr) {
        if (addr.name) addrLines.push(esc(addr.name));
        if (addr.address_line1 || addr.address) addrLines.push(esc(addr.address_line1 || addr.address));
        if (addr.address_line2) addrLines.push(esc(addr.address_line2));
        const cityLine = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
        if (cityLine) addrLines.push(esc(cityLine));
        if (addr.phone) addrLines.push(`Phone: ${esc(addr.phone)}`);
    }
    if (!addrLines.length) addrLines.push(esc(customerEmail || 'N/A'));

    const items = order.items || [];
    const subtotal = items.reduce((s, i) => s + Number(i.total ?? i.price * i.quantity), 0);
    const tax = order.taxAmount > 0 ? order.taxAmount : Math.round(subtotal * 0.18 * 100) / 100;
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

    const rows = items.map((i) => `
      <tr>
        <td class="item">${esc(i.productName || 'Product')}</td>
        <td class="qty">${esc(i.quantity)}</td>
        <td class="num">${fmt(i.price)}</td>
        <td class="num">${fmt(i.total ?? i.price * i.quantity)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 40pt; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: Helvetica, Arial, sans-serif; color: #282828; background: #fff; }
  .head { display: flex; align-items: baseline; justify-content: space-between; }
  .brand { font-size: 20pt; font-weight: bold; color: #1a1a1a; }
  .doctype { font-size: 11pt; color: #787878; }
  hr { border: 0; border-top: 1px solid #e6e6e6; margin: 12px 0 20px; }
  .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #5a5a5a; }
  .meta div + div { text-align: right; }
  h2 { font-size: 10pt; color: #1a1a1a; margin: 26px 0 10px; letter-spacing: .3px; }
  .addr { font-size: 10pt; color: #3c3c3c; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9.5pt; }
  thead th { background: #f5f5f5; color: #5a5a5a; font-size: 9pt; text-align: left; padding: 7px 6px; }
  thead th.qty, thead th.num { text-align: right; }
  tbody td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.qty, td.num, th.num { text-align: right; }
  td.item { width: 60%; }
  .totals { width: 260px; margin-left: auto; margin-top: 20px; font-size: 10pt; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .label { color: #5a5a5a; }
  .totals .grand { border-top: 1px solid #c8c8c8; margin-top: 8px; padding-top: 10px; font-size: 12pt; font-weight: bold; color: #1a1a1a; }
  footer { margin-top: 48px; font-size: 8.5pt; color: #969696; line-height: 1.6; }
</style></head><body>
  <div class="head"><span class="brand">ZPIN</span><span class="doctype">TAX INVOICE</span></div>
  <hr />
  <div class="meta">
    <div>
      Order Number: ${esc(order.orderNumber)}<br />
      Payment Method: ${esc((order.paymentMethod || 'N/A').toUpperCase())}
    </div>
    <div>
      Order Date: ${day(orderDate)}<br />
      Invoice Date: ${day(new Date())}
    </div>
  </div>

  <h2>BILL TO</h2>
  <div class="addr">${addrLines.join('<br />')}</div>

  <table>
    <thead><tr><th>ITEM</th><th class="qty">QTY</th><th class="num">PRICE</th><th class="num">TOTAL</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span class="label">Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div><span class="label">Delivery Fee</span><span>${Number(order.deliveryFee || 0) === 0 ? 'FREE' : fmt(order.deliveryFee)}</span></div>
    <div><span class="label">Tax (18% GST)</span><span>${fmt(tax)}</span></div>
    <div class="grand"><span>Total Paid</span><span>${fmt(order.totalAmount)}</span></div>
  </div>

  <footer>
    This is a computer-generated invoice and does not require a signature.<br />
    ZPIN &middot; support@zpin.in
  </footer>
</body></html>`;
}
