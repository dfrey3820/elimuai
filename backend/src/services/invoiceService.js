const PDFDocument = require('pdfkit');
const db = require('../config/database');
const logger = require('../config/logger');
const { getTrialConfig, getSettings } = require('./settingsService');

// ─── Billing Cycle Helpers ────────────────────────────────────────────────────

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 };

/**
 * Get discount percentage for a billing cycle from admin settings.
 */
const getCycleDiscount = async (cycle) => {
  const s = await getSettings();
  const discounts = {
    monthly: 0,
    quarterly: parseInt(s.billing_quarterly_discount, 10) || 10,
    semi_annual: parseInt(s.billing_semi_annual_discount, 10) || 15,
    annual: parseInt(s.billing_annual_discount, 10) || 20,
  };
  return discounts[cycle] || 0;
};

/**
 * Calculate the total amount for a given role + billing cycle.
 * monthly_price * months * (1 - discount/100), rounded to nearest integer.
 */
const calculateCyclePrice = async (role, cycle) => {
  const cfg = await getTrialConfig();
  const plan = cfg.plans[role] || cfg.plans.student;
  const months = CYCLE_MONTHS[cycle] || 1;
  const discount = await getCycleDiscount(cycle);
  const raw = plan.amount * months;
  const discounted = Math.round(raw * (1 - discount / 100));
  return {
    monthlyPrice: plan.amount,
    months,
    discount,
    originalTotal: raw,
    total: discounted,
    savings: raw - discounted,
    durationDays: months * 30,
    currency: 'KES',
  };
};

/**
 * Return pricing breakdown for all cycles for a given role.
 */
const getAllCyclePrices = async (role) => {
  const cycles = ['monthly', 'quarterly', 'semi_annual', 'annual'];
  const result = {};
  for (const cycle of cycles) {
    result[cycle] = await calculateCyclePrice(role, cycle);
  }
  return result;
};

// ─── Invoice Generation ───────────────────────────────────────────────────────

/**
 * Generate the next invoice number. Format: INV-YYYYMM-XXXX
 */
const nextInvoiceNumber = async () => {
  const prefix = `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
  const { rows } = await db.query(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1",
    [`${prefix}-%`]
  );
  let seq = 1;
  if (rows[0]) {
    const last = parseInt(rows[0].invoice_number.split('-').pop(), 10);
    if (!isNaN(last)) seq = last + 1;
  }
  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

/**
 * Create an invoice record in the database.
 */
const createInvoice = async ({ userId, plan, billingCycle, amount, currency = 'KES', paymentId = null, status = 'pending', subtotal = null, couponCode = null, couponDiscount = 0 }) => {
  const invoiceNumber = await nextInvoiceNumber();
  const months = CYCLE_MONTHS[billingCycle] || 1;
  const now = new Date();
  const periodStart = now;
  const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  const dueDate = now; // Due immediately for prepaid plans

  const { rows } = await db.query(
    `INSERT INTO invoices (invoice_number, user_id, payment_id, plan, billing_cycle, amount, currency, status, period_start, period_end, due_date, paid_at, subtotal, coupon_code, coupon_discount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [invoiceNumber, userId, paymentId, plan, billingCycle, amount, currency, status,
     periodStart, periodEnd, dueDate, status === 'paid' ? now : null,
     subtotal || amount, couponCode, couponDiscount]
  );
  logger.info(`Invoice created: ${invoiceNumber} for user ${userId} — ${currency} ${amount} (${billingCycle})${couponCode ? ` [coupon: ${couponCode}, -${couponDiscount}]` : ''}`);
  return rows[0];
};

/**
 * Mark an invoice as paid and link it to a payment.
 */
const markInvoicePaid = async (invoiceId, paymentId) => {
  const { rows } = await db.query(
    "UPDATE invoices SET status = 'paid', paid_at = NOW(), payment_id = $1 WHERE id = $2 RETURNING *",
    [paymentId, invoiceId]
  );
  return rows[0];
};

/**
 * Get user invoices.
 */
const getUserInvoices = async (userId, limit = 20) => {
  const { rows } = await db.query(
    'SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows;
};

// ─── PDF Generation ───────────────────────────────────────────────────────────

/**
 * Generate a PDF invoice and return it as a Buffer.
 */
const generateInvoicePDF = async (invoice, userName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a5f2a').text('ElimuAI', 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor('#999').text('ELIMU · UJUZI · MAFANIKIO', 50, 78);
      doc.fontSize(10).fillColor('#666').text('AI-powered learning for East Africa', 50, 92);

      // Invoice title
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#333').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`#${invoice.invoice_number}`, 400, 75, { align: 'right' })
        .text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-KE')}`, 400, 90, { align: 'right' });

      // Status badge
      const statusColor = invoice.status === 'paid' ? '#1a5f2a' : '#e65100';
      doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColor)
        .text(invoice.status.toUpperCase(), 400, 108, { align: 'right' });

      // Divider
      doc.moveTo(50, 135).lineTo(545, 135).strokeColor('#e0e0e0').stroke();

      // Bill To
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text('Bill To:', 50, 150);
      doc.fontSize(10).font('Helvetica').fillColor('#666').text(userName || 'Customer', 50, 165);

      // Details table
      const tableTop = 210;
      const col1 = 50, col2 = 250, col3 = 400, col4 = 500;

      // Table header
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
      doc.text('DESCRIPTION', col1, tableTop);
      doc.text('PERIOD', col2, tableTop);
      doc.text('CYCLE', col3, tableTop);
      doc.text('AMOUNT', col4, tableTop, { align: 'right', width: 45 });

      doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).strokeColor('#e0e0e0').stroke();

      // Table row
      const rowY = tableTop + 28;
      const cycleName = (invoice.billing_cycle || 'monthly').replace('_', ' ');
      doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`${(invoice.plan || '').charAt(0).toUpperCase() + (invoice.plan || '').slice(1)} Plan`, col1, rowY);
      doc.fillColor('#666');
      doc.text(`${new Date(invoice.period_start).toLocaleDateString('en-KE')} — ${new Date(invoice.period_end).toLocaleDateString('en-KE')}`, col2, rowY);
      doc.text(cycleName.charAt(0).toUpperCase() + cycleName.slice(1), col3, rowY);
      doc.font('Helvetica-Bold').fillColor('#333');
      const subtotalAmt = invoice.subtotal ? Number(invoice.subtotal) : Number(invoice.amount);
      doc.text(`${invoice.currency} ${subtotalAmt.toLocaleString()}`, col4, rowY, { align: 'right', width: 45 });

      let totalY = rowY + 30;

      // Show coupon discount if applied
      const couponDisc = Number(invoice.coupon_discount) || 0;
      if (couponDisc > 0) {
        doc.moveTo(350, totalY).lineTo(545, totalY).strokeColor('#e0e0e0').stroke();
        doc.fontSize(10).font('Helvetica').fillColor('#666');
        doc.text(`Subtotal:`, 350, totalY + 8);
        doc.text(`${invoice.currency} ${subtotalAmt.toLocaleString()}`, col4, totalY + 8, { align: 'right', width: 45 });
        doc.fillColor('#e65100');
        doc.text(`Coupon (${invoice.coupon_code || 'DISCOUNT'}):`, 350, totalY + 24);
        doc.text(`-${invoice.currency} ${couponDisc.toLocaleString()}`, col4, totalY + 24, { align: 'right', width: 45 });
        totalY += 42;
      }

      // Total
      doc.moveTo(350, totalY).lineTo(545, totalY).strokeColor('#e0e0e0').stroke();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a5f2a');
      doc.text('TOTAL:', 350, totalY + 10);
      doc.text(`${invoice.currency} ${Number(invoice.amount).toLocaleString()}`, col4, totalY + 10, { align: 'right', width: 45 });

      // Footer
      doc.fontSize(9).font('Helvetica').fillColor('#999')
        .text('Thank you for using ElimuAI. This invoice was generated automatically.', 50, 700, { align: 'center' })
        .text('Questions? Contact support@elimuai.africa', 50, 715, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  CYCLE_MONTHS,
  getCycleDiscount,
  calculateCyclePrice,
  getAllCyclePrices,
  nextInvoiceNumber,
  createInvoice,
  markInvoicePaid,
  getUserInvoices,
  generateInvoicePDF,
};
