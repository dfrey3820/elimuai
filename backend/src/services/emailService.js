const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { getSettings } = require('./settingsService');

let transporterCache = null;
let transporterCacheTime = 0;
const TRANSPORT_TTL = 300000; // 5 minutes

const getTransporter = async () => {
  if (transporterCache && Date.now() - transporterCacheTime < TRANSPORT_TTL) return transporterCache;
  const s = await getSettings();
  const host = s.smtp_host || process.env.SMTP_HOST || '';
  const port = parseInt(s.smtp_port || process.env.SMTP_PORT || '587', 10);
  const user = s.smtp_user || process.env.SMTP_USER || '';
  const pass = s.smtp_pass || process.env.SMTP_PASS || '';
  const fromName = s.smtp_from_name || process.env.SMTP_FROM_NAME || 'ElimuAI';
  const fromEmail = s.smtp_from_email || process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured — emails will be skipped');
    return null;
  }

  transporterCache = {
    transport: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from: `"${fromName}" <${fromEmail}>`,
  };
  transporterCacheTime = Date.now();
  return transporterCache;
};

const invalidateTransporter = () => { transporterCache = null; };

/**
 * Send an email. Returns true on success, false on failure.
 */
const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const t = await getTransporter();
    if (!t) {
      logger.warn(`Email skipped (SMTP not configured): to=${to} subject=${subject}`);
      return false;
    }
    await t.transport.sendMail({ from: t.from, to, subject, html, attachments });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error(`Email failed to ${to}:`, err.message);
    return false;
  }
};

/**
 * Send an invoice email with PDF attachment.
 */
const sendInvoiceEmail = async (to, invoice, pdfBuffer) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:30px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#1a5f2a;margin:0 0 4px">🎓 ElimuAI</h1>
        <p style="color:#666;font-size:12px;margin:0">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:24px;margin-bottom:16px">
        <h2 style="color:#333;font-size:18px;margin:0 0 16px">Invoice #${invoice.invoice_number}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666">Date:</td><td style="padding:6px 0;text-align:right">${new Date(invoice.created_at).toLocaleDateString('en-KE')}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Plan:</td><td style="padding:6px 0;text-align:right;text-transform:capitalize">${invoice.plan} (${invoice.billing_cycle})</td></tr>
          <tr><td style="padding:6px 0;color:#666">Period:</td><td style="padding:6px 0;text-align:right">${new Date(invoice.period_start).toLocaleDateString('en-KE')} — ${new Date(invoice.period_end).toLocaleDateString('en-KE')}</td></tr>
          <tr style="border-top:1px solid #eee"><td style="padding:10px 0;color:#333;font-weight:bold">Amount:</td><td style="padding:10px 0;text-align:right;font-size:20px;font-weight:bold;color:#1a5f2a">${invoice.currency} ${Number(invoice.amount).toLocaleString()}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Status:</td><td style="padding:6px 0;text-align:right"><span style="background:${invoice.status === 'paid' ? '#e6f9ee' : '#fff3e0'};color:${invoice.status === 'paid' ? '#1a5f2a' : '#e65100'};padding:2px 10px;border-radius:6px;font-size:12px;font-weight:bold">${invoice.status.toUpperCase()}</span></td></tr>
        </table>
      </div>
      <p style="color:#999;font-size:11px;text-align:center">Thank you for using ElimuAI. This invoice was generated automatically.</p>
    </div>
  `;
  const attachments = pdfBuffer ? [{
    filename: `ElimuAI-Invoice-${invoice.invoice_number}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }] : [];
  return sendEmail(to, `ElimuAI Invoice #${invoice.invoice_number}`, html, attachments);
};

/**
 * Send a payment confirmation email.
 */
const sendPaymentConfirmation = async (to, { name, plan, amount, currency, receipt, expiresAt }) => {
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:30px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#1a5f2a;margin:0 0 4px">🎓 ElimuAI</h1>
        <p style="color:#666;font-size:12px;margin:0">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:24px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:48px">✅</div>
          <h2 style="color:#1a5f2a;margin:8px 0 4px">Payment Confirmed!</h2>
          <p style="color:#666;font-size:13px;margin:0">Hi ${name}, your payment has been processed successfully.</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666">Plan:</td><td style="padding:6px 0;text-align:right;text-transform:capitalize">${plan}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Amount:</td><td style="padding:6px 0;text-align:right;font-weight:bold">${currency} ${Number(amount).toLocaleString()}</td></tr>
          ${receipt ? `<tr><td style="padding:6px 0;color:#666">M-Pesa Receipt:</td><td style="padding:6px 0;text-align:right">${receipt}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#666">Valid Until:</td><td style="padding:6px 0;text-align:right">${new Date(expiresAt).toLocaleDateString('en-KE')}</td></tr>
        </table>
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px">Keep learning, keep growing! 🌱</p>
    </div>
  `;
  return sendEmail(to, '✅ ElimuAI Payment Confirmed', html);
};

module.exports = { sendEmail, sendInvoiceEmail, sendPaymentConfirmation, invalidateTransporter };
