let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.error('Failed to load nodemailer:', e);
}

module.exports = async function handler(req, res) {
  console.log('Newsletter function called, method:', req.method);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!nodemailer) {
    return res.status(500).json({ error: 'Nodemailer not available' });
  }

  try {
    const { to, subject, body, html, fromName } = req.body || {};
    console.log('Request body:', { to, subject, fromName, bodyLength: body?.length, hasHtml: !!html });

    if (!to || to.length === 0) {
      return res.status(400).json({ error: 'Keine Empfänger angegeben' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Betreff und Nachricht erforderlich' });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    console.log('SMTP config exists:', !!smtpUser, !!smtpPass);

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({ error: 'SMTP-Konfiguration fehlt' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    let successCount = 0;
    const errors = [];

    for (const recipient of to) {
      try {
        console.log('Sending to:', recipient);
        await transporter.sendMail({
          from: `${fromName || 'Tennisschule'} <${smtpUser}>`,
          to: recipient,
          subject: subject,
          text: body,
          html: html || body,
        });
        successCount++;
        console.log('Sent successfully to:', recipient);
      } catch (err) {
        console.error('Send error:', err.message);
        errors.push(`${recipient}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      sent: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('Newsletter error:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
