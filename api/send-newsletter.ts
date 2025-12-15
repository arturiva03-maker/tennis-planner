const nodemailer = require('nodemailer');

module.exports = async function handler(req: any, res: any) {
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

  try {
    const { to, subject, body, fromName } = req.body;

    if (!to || to.length === 0) {
      return res.status(400).json({ error: 'Keine Empfänger angegeben' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Betreff und Nachricht erforderlich' });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

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
    const errors: string[] = [];

    for (const recipient of to) {
      try {
        await transporter.sendMail({
          from: `${fromName} <${smtpUser}>`,
          to: recipient,
          subject: subject,
          text: body,
        });
        successCount++;
      } catch (err: any) {
        errors.push(`${recipient}: ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      sent: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('Newsletter error:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
