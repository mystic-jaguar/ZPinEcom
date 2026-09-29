/**
 * Invoice HTML for the order "Invoice" button.
 *
 * ZPIN Private Limited buys from the vendor and sells to the customer, so the
 * invoice is issued by ZPIN (SOLD BY), billed and shipped to the customer, and
 * only NAMES the store that physically fulfils it — same model as the customer
 * website's redesigned invoice (website-customer/src/utils/invoice.js). Never
 * print the vendor's GSTIN, address, phone or the raw vendor price here.
 *
 * Rendered in a WebView for the preview and handed to expo-print unchanged for
 * the PDF, so preview and download can never drift apart.
 */

// Statutory details — kept identical to the website's invoice config.
const INVOICE_CONFIG = {
    legalName: 'ZPIN Private Limited',
    gstin: '27AACCZ8184H2C2',
    registeredAddress: 'IMED Bharti Vidyapeeth, Pune Road, Kothrud, Pune, Maharashtra - 411038',
    email: 'zpinpvtltd@gmail.com',
    defaultGstRate: 0.18,
    vendorPlaceholder: 'ZPIN Partner',
};

export interface InvoiceData {
    orderNumber: string;
    createdAt?: string;
    paymentMethod?: string;
    // 'paid' | 'partial' | 'refunded' | 'pending' | 'failed'. A COD order stays
    // 'pending' until the money is handed over at the door, so the grand-total
    // line must not claim it was paid.
    paymentStatus?: string;
    shippingAddress?: any;
    items: { productName: string; quantity: number; price: number; total?: number; variant?: string }[];
    deliveryFee: number;
    taxAmount: number;
    totalAmount: number;
    // Coupon/promo amount already subtracted from totalAmount.
    discount?: number;
    // How much of totalAmount was already settled online (Instant Delivery on COD).
    prepaidAmount?: number;
    // The store name that fulfils this order. Never the vendor's GSTIN/address/phone.
    fulfilledBy?: string;
}

const fmt = (n: number) =>
    `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

const day = (d: Date) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });

// Indian numbering (crore / lakh / thousand) — mirrors the website's amountInWords.
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const twoDigits = (n: number): string => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return [h ? `${ONES[h]} Hundred` : '', r ? twoDigits(r) : ''].filter(Boolean).join(' ');
};
function numberToWords(n: number): string {
    if (n === 0) return 'Zero';
    const crore = Math.floor(n / 1e7);
    const lakh = Math.floor(n / 1e5) % 100;
    const thousand = Math.floor(n / 1e3) % 100;
    const rest = n % 1000;
    return [
        crore ? `${numberToWords(crore)} Crore` : '',
        lakh ? `${twoDigits(lakh)} Lakh` : '',
        thousand ? `${twoDigits(thousand)} Thousand` : '',
        rest ? threeDigits(rest) : '',
    ].filter(Boolean).join(' ');
}
function amountInWords(amount: number): string {
    const rupees = Math.floor(round2(amount));
    const paise = Math.round((round2(amount) - rupees) * 100);
    return `Rupees ${numberToWords(rupees)}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

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
        if (addr.address_line1 || addr.address) addrLines.push(esc(addr.address_line1 || addr.address));
        if (addr.address_line2) addrLines.push(esc(addr.address_line2));
        const cityLine = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
        if (cityLine) addrLines.push(esc(cityLine));
    }
    if (!addrLines.length) addrLines.push('Address not available');
    const customerName = esc(addr?.name || customerEmail || 'Customer');

    const items = order.items || [];
    const cfg = INVOICE_CONFIG;
    const taxableValue = round2(items.reduce((s, i) => s + Number(i.total ?? Number(i.price) * i.quantity), 0));
    const gst = order.taxAmount > 0 ? round2(order.taxAmount) : round2(taxableValue * cfg.defaultGstRate);
    const cgst = round2(gst / 2);
    const sgst = round2(gst - cgst);

    // Spread GST over lines proportionally so the inclusive line totals reconcile
    // with the tax breakup below (same approach as the website invoice).
    let gstLeft = gst;
    const rows = items.map((i, idx) => {
        const taxable = round2(Number(i.total ?? Number(i.price) * i.quantity));
        const share = idx === items.length - 1 ? round2(gstLeft) : round2(taxableValue ? gst * (taxable / taxableValue) : 0);
        gstLeft -= share;
        const totalInclGst = round2(taxable + share);
        const unitInclGst = i.quantity ? round2(totalInclGst / i.quantity) : totalInclGst;
        return `
      <tr>
        <td class="item">${esc(i.productName || 'Product')}${i.variant ? `<div class="sub">${esc(i.variant)}</div>` : ''}</td>
        <td class="qty">${esc(i.quantity)}</td>
        <td class="num">${fmt(unitInclGst)}</td>
        <td class="num">${fmt(totalInclGst)}</td>
      </tr>`;
    }).join('');

    const delivery = round2(order.deliveryFee || 0);
    const discount = round2(order.discount || 0);
    const total = round2(order.totalAmount);
    const prepaid = round2(order.prepaidAmount || 0);
    const settled = ['paid', 'refunded'].includes(String(order.paymentStatus || '').toLowerCase());
    const partial = String(order.paymentStatus || '').toLowerCase() === 'partial' && prepaid > 0;
    const balance = round2(Math.max(total - prepaid, 0));

    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const invoiceDate = new Date();
    const shortId = String(order.orderNumber || '').replace(/^ORD-|^ZP-/i, '').toUpperCase();
    const fy = (() => {
        const ist = new Date(invoiceDate.getTime() + 5.5 * 3600000); // IST year/month
        const y = ist.getUTCFullYear() % 100;
        const start = ist.getUTCMonth() >= 3 ? y : y - 1;
        return `${String(start).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
    })();

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
  .split { display: flex; justify-content: space-between; gap: 24px; }
  .soldBy { font-size: 10pt; color: #3c3c3c; line-height: 1.5; }
  .soldByName { font-weight: bold; color: #1a1a1a; font-size: 11pt; }
  .meta { font-size: 10pt; color: #5a5a5a; text-align: right; }
  .meta .row { margin-bottom: 4px; }
  .meta .row b { color: #1a1a1a; }
  h2 { font-size: 10pt; color: #1a1a1a; margin: 20px 0 8px; letter-spacing: .3px; }
  .parties { display: flex; gap: 16px; margin-top: 4px; }
  .party { flex: 1; background: #f9f9f9; border-radius: 8px; padding: 12px 14px; }
  .party .lbl { font-size: 8.5pt; color: #b06a10; font-weight: bold; letter-spacing: .4px; text-transform: uppercase; margin-bottom: 4px; }
  .addr { font-size: 10pt; color: #3c3c3c; line-height: 1.5; }
  .fulfilled { margin-top: 12px; background: #fff8ef; border: 1px solid #f4deb0; border-radius: 8px; padding: 10px 14px; font-size: 10pt; }
  .fulfilled .lbl { font-size: 8.5pt; color: #999; text-transform: uppercase; letter-spacing: .3px; }
  .fulfilled .name { font-weight: bold; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 9.5pt; }
  thead th { background: #f5f5f5; color: #5a5a5a; font-size: 9pt; text-align: left; padding: 7px 6px; }
  thead th.qty, thead th.num { text-align: right; }
  tbody td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.qty, td.num, th.num { text-align: right; }
  td.item { width: 50%; }
  .sub { color: #969696; font-size: 8.5pt; }
  .note { font-size: 8pt; color: #969696; margin-top: 8px; }
  .totals { width: 280px; margin-left: auto; margin-top: 16px; font-size: 10pt; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .label { color: #5a5a5a; }
  .totals .grand { border-top: 1px solid #c8c8c8; margin-top: 8px; padding-top: 10px; font-size: 12pt; font-weight: bold; color: #b06a10; }
  .totals .sub-pay { font-size: 8.5pt; color: #969696; }
  .words { margin-top: 14px; font-size: 9pt; color: #3c3c3c; }
  .words b { color: #1a1a1a; }
  footer { margin-top: 40px; font-size: 8.5pt; color: #969696; line-height: 1.6; }
</style></head><body>
  <div class="head"><span class="brand">ZPIN</span><span class="doctype">TAX INVOICE</span></div>
  <hr />

  <div class="split">
    <div class="soldBy">
      <div class="lbl" style="font-size:8.5pt;color:#b06a10;font-weight:bold;letter-spacing:.4px;text-transform:uppercase;margin-bottom:4px;">Sold by</div>
      <div class="soldByName">${esc(cfg.legalName)}</div>
      <div>${esc(cfg.registeredAddress)}</div>
      <div>GSTIN: ${esc(cfg.gstin)}</div>
      <div>Email: ${esc(cfg.email)}</div>
    </div>
    <div class="meta">
      <div class="row">Invoice No. <b>ZP/${fy}/${shortId || '—'}</b></div>
      <div class="row">Invoice Date <b>${day(invoiceDate)}</b></div>
      <div class="row">Order ID <b>#${shortId || '—'}</b></div>
      <div class="row">Order Date <b>${day(orderDate)}</b></div>
      <div class="row">Payment Method <b>${esc((order.paymentMethod || 'N/A').toUpperCase())}</b></div>
    </div>
  </div>

  <h2>BILL TO / SHIP TO</h2>
  <div class="parties">
    <div class="party">
      <div class="lbl">Bill to</div>
      <div style="font-weight:bold">${customerName}</div>
      <div class="addr">${addrLines.join('<br />')}</div>
    </div>
    <div class="party">
      <div class="lbl">Ship to</div>
      <div style="font-weight:bold">${customerName}</div>
      <div class="addr">${addrLines.join('<br />')}</div>
    </div>
  </div>

  <div class="fulfilled">
    <span class="lbl">Fulfilled by</span> &nbsp;
    <span class="name">${esc(order.fulfilledBy || cfg.vendorPlaceholder)}</span>
  </div>

  <table>
    <thead><tr><th>ITEM</th><th class="qty">QTY</th><th class="num">UNIT PRICE (incl. GST)</th><th class="num">TOTAL (incl. GST)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">All prices shown are inclusive of GST.</div>

  <div class="totals">
    <div><span class="label">Taxable Value</span><span>${fmt(taxableValue)}</span></div>
    <div><span class="label">CGST @ ${(cfg.defaultGstRate * 50).toFixed(1)}%</span><span>${fmt(cgst)}</span></div>
    <div><span class="label">SGST @ ${(cfg.defaultGstRate * 50).toFixed(1)}%</span><span>${fmt(sgst)}</span></div>
    <div><span class="label">Delivery Charges</span><span>${delivery === 0 ? 'FREE' : fmt(delivery)}</span></div>
    ${discount > 0 ? `<div><span class="label">Coupon Discount</span><span>&minus; ${fmt(discount)}</span></div>` : ''}
    <div class="grand"><span>${settled ? 'Total Amount Paid' : 'Total Amount Payable'}</span><span>${fmt(total)}</span></div>
    ${partial ? `
    <div class="sub-pay"><span>Paid Online</span><span>${fmt(prepaid)}</span></div>
    <div class="sub-pay"><span>Balance Payable on Delivery</span><span>${fmt(balance)}</span></div>` : ''}
  </div>

  <div class="words">Amount in words: <b>${esc(amountInWords(total))}</b></div>

  <footer>
    This is a computer-generated invoice and does not require a signature.<br />
    ${esc(cfg.legalName)} &middot; GSTIN: ${esc(cfg.gstin)} &middot; ${esc(cfg.email)}
  </footer>
</body></html>`;
}
