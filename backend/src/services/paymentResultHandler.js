const db = require('../config/database');
const logger = require('../config/logger');
const { CYCLE_MONTHS, generateInvoicePDF } = require('./invoiceService');
const { sendInvoiceEmail, sendPaymentConfirmation } = require('./emailService');

/**
 * Handle a payment result from the queue.
 * Called by the result queue worker when mpesa-service publishes an outcome.
 *
 * @param {Object} result - { paymentId, status, checkoutRequestId?, receipt?, amount?, phone?, error? }
 */
const handlePaymentResult = async (result) => {
  const { paymentId, status, checkoutRequestId, receipt, amount, phone, error } = result;

  logger.info(`Processing payment result: paymentId=${paymentId}, status=${status}`);

  // ─── STK Push was sent successfully (waiting for user to confirm on phone) ─
  if (status === 'stk_sent' && checkoutRequestId) {
    await db.query(
      "UPDATE payments SET mpesa_checkout_id = $1 WHERE id = $2",
      [checkoutRequestId, paymentId]
    );
    logger.info(`Payment ${paymentId}: STK push sent, checkoutRequestId=${checkoutRequestId}`);
    return;
  }

  // ─── Payment failed ────────────────────────────────────────────────────────
  if (status === 'failed') {
    await db.query(
      "UPDATE payments SET status = 'failed', metadata = metadata || $1::jsonb WHERE id = $2",
      [JSON.stringify({ error: error || 'Unknown error' }), paymentId]
    );
    await db.query("UPDATE invoices SET status = 'cancelled' WHERE payment_id = $1", [paymentId]);
    logger.warn(`Payment ${paymentId} failed: ${error}`);
    return;
  }

  // ─── Payment completed ─────────────────────────────────────────────────────
  if (status === 'completed') {
    // Mark payment complete
    await db.query(
      `UPDATE payments SET status = 'completed', mpesa_receipt = $1, completed_at = NOW(),
       metadata = metadata || $2::jsonb WHERE id = $3`,
      [receipt, JSON.stringify({ receipt, amount, phone }), paymentId]
    );

    // Get payment details to activate plan
    const { rows } = await db.query(
      'SELECT user_id, plan, billing_cycle, invoice_id FROM payments WHERE id = $1',
      [paymentId]
    );
    if (!rows[0]) {
      logger.error(`Payment ${paymentId} not found in DB after completion`);
      return;
    }

    const { user_id, plan, billing_cycle, invoice_id } = rows[0];

    // Calculate plan duration
    const months = CYCLE_MONTHS[billing_cycle] || 1;
    const duration = months * 30;
    const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    // Activate user plan
    await db.query(
      "UPDATE users SET plan = $1, plan_expires = $2 WHERE id = $3",
      [plan, expiresAt, user_id]
    );

    // Mark invoice as paid
    if (invoice_id) {
      await db.query("UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1", [invoice_id]);
    }

    logger.info(`Payment confirmed: ${receipt} — User ${user_id} upgraded to ${plan} (${billing_cycle}) until ${expiresAt.toISOString()}`);

    // Get user details for notifications
    const { rows: userRows } = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [user_id]);
    const userInfo = userRows[0];

    // Send confirmation SMS
    try {
      const { sendSMS } = require('./smsService');
      const cycleName = (billing_cycle || 'monthly').replace('_', ' ');
      await sendSMS(
        String(phone || userInfo?.phone),
        `✅ ElimuAI: Malipo ya KES ${amount} yamekubaliwa. Mpango wako wa ${plan} (${cycleName}) umeanza. Msimbo: ${receipt}`
      );
    } catch (smsErr) {
      logger.error('Post-payment SMS error:', smsErr.message);
    }

    // Send email with invoice PDF
    if (userInfo?.email && invoice_id) {
      try {
        const { rows: invRows } = await db.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
        if (invRows[0]) {
          const pdfBuffer = await generateInvoicePDF(invRows[0], userInfo.name);
          await sendInvoiceEmail(userInfo.email, invRows[0], pdfBuffer);
          await sendPaymentConfirmation(userInfo.email, {
            name: userInfo.name, plan, amount, currency: 'KES', receipt, expiresAt,
          });
        }
      } catch (emailErr) {
        logger.error('Post-payment email error:', emailErr.message);
      }
    }
    return;
  }

  logger.warn(`Unknown payment result status: ${status} for paymentId=${paymentId}`);
};

module.exports = { handlePaymentResult };
