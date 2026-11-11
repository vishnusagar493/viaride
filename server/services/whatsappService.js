const https = require('https');
const { query } = require('../config/database');

/**
 * WhatsApp Business Cloud API service
 * Uses official Meta WhatsApp Cloud API
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER; // e.g., 919867998094

const sendWhatsAppMessage = async (to, message, booking_id = null) => {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('WhatsApp API not configured. Skipping notification.');
    return;
  }

  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: message },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/v18.0/${PHONE_NUMBER_ID}/messages`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      async (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', async () => {
          try {
            const parsed = JSON.parse(data);
            const wa_message_id = parsed.messages?.[0]?.id || null;
            const status = res.statusCode === 200 ? 'sent' : 'failed';

            // Log to DB
            await query(
              `INSERT INTO whatsapp_logs (recipient_phone, message, status, wa_message_id, booking_id, sent_at)
               VALUES ($1,$2,$3,$4,$5,NOW())`,
              [to, message.substring(0, 500), status, wa_message_id, booking_id]
            ).catch(err => console.error('WA log error:', err.message));

            resolve(parsed);
          } catch (e) {
            resolve(null);
          }
        });
      }
    );

    req.on('error', async (err) => {
      console.error('WhatsApp API error:', err.message);
      await query(
        `INSERT INTO whatsapp_logs (recipient_phone, message, status, error_message, booking_id)
         VALUES ($1,$2,'failed',$3,$4)`,
        [to, message.substring(0, 500), err.message, booking_id]
      ).catch(() => {});
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
};

const sendNewBookingAlert = async (booking, user) => {
  if (!ADMIN_NUMBER) return;

  const message = `🚗 *VIAROAD – NEW BOOKING ALERT*

Hello Admin,

You have received a new booking!

*Booking ID:* ${booking.booking_number}
*Customer:* ${user.full_name}
*Service:* ${booking.service_type.replace(/_/g, ' ').toUpperCase()}
*Pickup:* ${booking.pickup_location}
*Destination:* ${booking.destination || 'N/A'}
*Journey Date:* ${booking.journey_date}
*Pickup Time:* ${booking.pickup_time}
*Payment Method:* ${booking.payment_method?.replace(/_/g, ' ') || 'N/A'}
*Total Amount:* ₹${booking.total_amount}

Please log in to the VIAROAD Admin Dashboard to review.

_Your Journey. Our Responsibility._`;

  await sendWhatsAppMessage(ADMIN_NUMBER, message, booking.id);
};

const sendBookingConfirmation = async (booking, user) => {
  if (!user.mobile || !user.whatsapp_consent) return;

  const message = `✅ *VIAROAD – BOOKING CONFIRMED!*

Hello ${user.full_name},

Your booking has been successfully approved!

*Booking ID:* ${booking.booking_number}
*Service:* ${booking.service_type.replace(/_/g, ' ').toUpperCase()}
*Pickup:* ${booking.pickup_location}
*Destination:* ${booking.destination || 'N/A'}
*Journey Date:* ${booking.journey_date}
*Pickup Time:* ${booking.pickup_time}
*Amount:* ₹${booking.total_amount}

Thank you for choosing VIAROAD.
📞 Helpline: 9867998094

_Your Journey. Our Responsibility._`;

  const phone = `91${user.mobile.replace(/^0/, '')}`;
  await sendWhatsAppMessage(phone, message, booking.id);
};

const sendBookingRejection = async (booking, user) => {
  if (!user.mobile || !user.whatsapp_consent) return;

  const message = `❌ *VIAROAD – BOOKING UPDATE*

Hello ${user.full_name},

We regret to inform you that your booking could not be approved.

*Booking ID:* ${booking.booking_number}
*Reason:* ${booking.admin_notes || 'Please contact us for details.'}

📞 Contact us: 9867998094

We apologize for the inconvenience. Please try booking again or contact our support team.

_Your Journey. Our Responsibility._`;

  const phone = `91${user.mobile.replace(/^0/, '')}`;
  await sendWhatsAppMessage(phone, message, booking.id);
};

const sendPaymentVerifiedNotification = async (booking, user) => {
  if (!user.mobile || !user.whatsapp_consent) return;

  const message = `💰 *VIAROAD – PAYMENT VERIFIED*

Hello ${user.full_name},

Your payment for Booking #${booking.booking_number} has been successfully verified.

Your journey is confirmed. See you soon!

📞 Helpline: 9867998094

_Your Journey. Our Responsibility._`;

  const phone = `91${user.mobile.replace(/^0/, '')}`;
  await sendWhatsAppMessage(phone, message, booking.id);
};

module.exports = {
  sendNewBookingAlert,
  sendBookingConfirmation,
  sendBookingRejection,
  sendPaymentVerifiedNotification,
  sendWhatsAppMessage,
};
