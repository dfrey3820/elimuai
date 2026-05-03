const logger = require('../config/logger');
const { getSettings } = require('./settingsService');

const MAILTRAP_API_URL = process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io';
const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN || '';
const MAILTRAP_INBOX_ID = process.env.MAILTRAP_INBOX_ID || ''; // only needed for sandbox

const IS_SANDBOX = MAILTRAP_API_URL.includes('sandbox');

const getFromInfo = async () => {
  const s = await getSettings();
  return {
    name: s.smtp_from_name || process.env.SMTP_FROM_NAME || 'ElimuAI',
    email: s.smtp_from_email || process.env.SMTP_FROM_EMAIL || 'noreply@adila.legal',
  };
};

const invalidateTransporter = () => {};

/**
 * Send an email via Mailtrap HTTP API. Returns true on success, false on failure.
 * Supports both sandbox (Api-Token + inbox ID) and production (Bearer token).
 */
const sendEmail = async (to, subject, html, attachments = []) => {
  if (!MAILTRAP_API_TOKEN) {
    logger.warn(`Email skipped (Mailtrap not configured): to=${to} subject=${subject}`);
    return false;
  }
  if (IS_SANDBOX && !MAILTRAP_INBOX_ID) {
    logger.warn(`Email skipped (sandbox inbox ID missing): to=${to} subject=${subject}`);
    return false;
  }
  try {
    const from = await getFromInfo();
    const body = {
      from: { email: from.email, name: from.name },
      to: [{ email: to }],
      subject,
      html,
    };
    if (attachments.length > 0) {
      body.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        type: a.contentType || 'application/octet-stream',
        disposition: 'attachment',
      }));
    }

    const url = IS_SANDBOX
      ? `${MAILTRAP_API_URL}/api/send/${MAILTRAP_INBOX_ID}`
      : `${MAILTRAP_API_URL}/api/send`;

    const headers = {
      'Content-Type': 'application/json',
      ...(IS_SANDBOX
        ? { 'Api-Token': MAILTRAP_API_TOKEN }
        : { 'Authorization': `Bearer ${MAILTRAP_API_TOKEN}` }),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mailtrap API ${res.status}: ${err}`);
    }
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

/**
 * Send subscription expiry warning email.
 */
const sendExpiryWarning = async (to, { name, plan, daysLeft, expiresAt, lang = 'en' }) => {
  const isSw = lang === 'sw';
  const renewUrl = process.env.FRONTEND_URL || 'https://elimuai.africa';
  const subject = isSw
    ? `⚠️ Usajili wako wa ElimuAI unaisha ${daysLeft <= 0 ? 'leo' : `siku ${daysLeft}`}`
    : `⚠️ Your ElimuAI subscription expires ${daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}`;
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:30px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#7c3aed;margin:0 0 4px">🎓 ElimuAI</h1>
        <p style="color:#666;font-size:12px;margin:0">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:24px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:48px">⏰</div>
          <h2 style="color:#ea580c;margin:8px 0 4px">${isSw ? 'Usajili Unaisha!' : 'Subscription Expiring!'}</h2>
          <p style="color:#666;font-size:13px;margin:0">${isSw ? `Habari ${name},` : `Hi ${name},`}</p>
        </div>
        <p style="color:#333;font-size:14px;line-height:1.6;margin:16px 0">
          ${isSw
            ? `Mpango wako wa <strong style="text-transform:capitalize">${plan}</strong> ${daysLeft <= 0 ? 'umeisha leo' : `utaisha tarehe <strong>${new Date(expiresAt).toLocaleDateString('sw-KE')}</strong> (siku ${daysLeft} zilizobaki)`}. Hudhuria ili kuendelea kujifunza bila kukatizwa.`
            : `Your <strong style="text-transform:capitalize">${plan}</strong> plan ${daysLeft <= 0 ? 'expires today' : `expires on <strong>${new Date(expiresAt).toLocaleDateString('en-KE')}</strong> (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`}. Renew now to keep learning without interruption.`
          }
        </p>
        <div style="text-align:center;margin:24px 0 16px">
          <a href="${renewUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:16px;font-weight:bold">
            ${isSw ? '🔄 Huisha Sasa' : '🔄 Renew Now'}
          </a>
        </div>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin:16px 0">
          <p style="color:#92400e;font-size:12px;margin:0;font-weight:bold">
            ${isSw
              ? '💡 Chagua mpango wa mwaka na uokoe hadi 30%!'
              : '💡 Switch to an annual plan and save up to 30%!'}
          </p>
        </div>
        <p style="color:#666;font-size:12px;margin:16px 0 0">
          ${isSw
            ? 'Ukiisha, utarudi mpango wa bure na huduma za msingi pekee.'
            : 'After expiry, your account will revert to the free plan with basic features only.'}
        </p>
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px">${isSw ? 'Timu ya ElimuAI' : 'The ElimuAI Team'} · <a href="${renewUrl}" style="color:#7c3aed">elimuai.africa</a></p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

/**
 * Send free-plan upgrade nudge email.
 */
const sendUpgradeNudge = async (to, { name, lang = 'en' }) => {
  const isSw = lang === 'sw';
  const upgradeUrl = process.env.FRONTEND_URL || 'https://elimuai.africa';
  const subject = isSw
    ? '🚀 Boresha Mpango wako wa ElimuAI'
    : '🚀 Upgrade your ElimuAI plan';
  const html = `
    <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:30px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#7c3aed;margin:0 0 4px">🎓 ElimuAI</h1>
        <p style="color:#666;font-size:12px;margin:0">ELIMU · UJUZI · MAFANIKIO</p>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:24px">
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:48px">🌟</div>
          <h2 style="color:#7c3aed;margin:8px 0 4px">${isSw ? 'Boresha Kujifunza Kwako!' : 'Level Up Your Learning!'}</h2>
          <p style="color:#666;font-size:13px;margin:0">${isSw ? `Habari ${name},` : `Hi ${name},`}</p>
        </div>
        <p style="color:#333;font-size:14px;line-height:1.6;margin:16px 0">
          ${isSw
            ? 'Uko kwenye mpango wa bure. Boresha na upate huduma zaidi:'
            : 'You\'re on the free plan. Upgrade to unlock powerful features:'}
        </p>
        <ul style="color:#333;font-size:13px;line-height:2;padding-left:20px;margin:12px 0">
          <li>${isSw ? '🤖 AI Tutor bila kikomo' : '🤖 Unlimited AI Tutor sessions'}</li>
          <li>${isSw ? '📝 Mitihani ya zamani' : '📝 Past paper exam practice'}</li>
          <li>${isSw ? '📊 Ripoti za kina kila wiki' : '📊 Detailed weekly reports'}</li>
          <li>${isSw ? '🏆 Ushindani wa ubao wa viongozi' : '🏆 Full leaderboard access'}</li>
        </ul>
        <div style="text-align:center;margin:24px 0 16px">
          <a href="${upgradeUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:16px;font-weight:bold">
            ${isSw ? '⬆️ Boresha Sasa' : '⬆️ Upgrade Now'}
          </a>
        </div>
        <p style="color:#666;font-size:12px;margin:16px 0 0;text-align:center">
          ${isSw ? 'Kuanzia KES 299/mwezi tu' : 'Starting from just KES 299/month'}
        </p>
      </div>
      <p style="color:#999;font-size:11px;text-align:center;margin-top:16px">${isSw ? 'Timu ya ElimuAI' : 'The ElimuAI Team'} · <a href="${upgradeUrl}" style="color:#7c3aed">elimuai.africa</a></p>
    </div>
  `;
  return sendEmail(to, subject, html);
};

module.exports = { sendEmail, sendInvoiceEmail, sendPaymentConfirmation, sendExpiryWarning, sendUpgradeNudge, invalidateTransporter };
