/**
 * lib/whatsapp.js — WATI WhatsApp API wrapper
 * Docs: https://docs.wati.io/reference/post_api-v1-sendtemplatemessage
 */

const WATI_ENDPOINT = process.env.WATI_API_ENDPOINT || 'https://live-mt-server.wati.io/api/v1';
const WATI_API_KEY = process.env.WATI_API_KEY;

/**
 * Send a WhatsApp template message via WATI.
 *
 * @param {string} phone       - Recipient phone in E.164 format (e.g. "+919876543210")
 * @param {string} templateName - WATI template name (must be pre-approved)
 * @param {Array<{name: string, value: string}>} parameters - Template variable substitutions
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendMessage(phone, templateName, parameters = []) {
  if (!WATI_API_KEY) {
    console.warn('[WhatsApp] WATI_API_KEY not set — skipping WhatsApp notification.');
    return { success: false, error: 'WATI_API_KEY not configured' };
  }

  // Normalize phone: strip spaces/dashes, ensure starts with +
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { success: false, error: `Invalid phone number: ${phone}` };
  }

  try {
    const url = `${WATI_ENDPOINT}/sendTemplateMessage?whatsappNumber=${encodeURIComponent(normalizedPhone)}`;

    const payload = {
      template_name: templateName,
      broadcast_name: `trolley_${Date.now()}`,
      parameters: parameters.map((p) => ({
        name: p.name,
        value: String(p.value),
      })),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WATI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.result === false) {
      console.error('[WhatsApp] WATI API error:', data);
      return { success: false, error: data.info || data.message || 'WATI error' };
    }

    return { success: true, messageId: data.id || data.messageId };
  } catch (err) {
    console.error('[WhatsApp] Fetch error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send the checkout receipt message.
 * Template name: "trolley_checkout" (must be created in WATI dashboard)
 * Variables: {{1}} = trolleyID, {{2}} = total, {{3}} = paymentUrl
 */
export async function sendCheckoutReceipt({ phone, trolleyID, total, paymentUrl }) {
  return sendMessage(phone, 'trolley_checkout', [
    { name: '1', value: trolleyID },
    { name: '2', value: `₹${parseFloat(total).toFixed(2)}` },
    { name: '3', value: paymentUrl },
  ]);
}

/**
 * Normalize phone number to E.164.
 * Handles: "9876543210", "+919876543210", "091-9876543210"
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // If no country code prefix, assume India (+91)
  if (cleaned.startsWith('0')) cleaned = '+91' + cleaned.slice(1);
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = '+91' + cleaned;
    else if (cleaned.length === 12 && cleaned.startsWith('91')) cleaned = '+' + cleaned;
  }
  // Basic validation: E.164 must be 7–15 digits after +
  const digits = cleaned.replace('+', '');
  if (digits.length < 7 || digits.length > 15) return null;
  return cleaned;
}
