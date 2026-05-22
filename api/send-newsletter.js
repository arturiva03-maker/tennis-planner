let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.error('Failed to load nodemailer:', e);
}

module.exports = async function handler(req, res) {
  console.log('Newsletter function called, method:', req.method);

  // CORS - nur erlaubte Domains
  const allowedOrigins = [
    'https://bscrehberge-tennis.de',
    'https://www.bscrehberge-tennis.de',
    'https://tc-britz.de',
    'https://www.tc-britz.de',
    'https://tennis-planner.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
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
    const { to, subject, body, html, fromName, attachment, attachments } = req.body || {};
    const attList = Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : (attachment ? [attachment] : []);
    console.log('Request body:', { to, subject, fromName, bodyLength: body?.length, hasHtml: !!html, attachmentCount: attList.length });

    if (!to || to.length === 0) {
      return res.status(400).json({ error: 'Keine Empfänger angegeben' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Betreff und Nachricht erforderlich' });
    }

    // Security: Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of to) {
      if (!emailRegex.test(recipient)) {
        return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
      }
    }

    // Security: Limit total attachments size (5MB)
    let totalAttBytes = 0;
    for (const att of attList) {
      if (att && att.content) {
        totalAttBytes += Buffer.byteLength(att.content, att.encoding || 'base64');
      }
    }
    if (totalAttBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Anhänge zu groß (max. 5MB gesamt)' });
    }

    // Security: Limit number of recipients
    if (to.length > 100) {
      return res.status(400).json({ error: 'Zu viele Empfänger (max. 100)' });
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
        const mailOptions = {
          from: `${fromName || 'Tennisschule'} <${smtpUser}>`,
          to: recipient,
          subject: subject,
          text: body,
          html: html || body,
        };

        if (attList.length > 0) {
          mailOptions.attachments = attList.map((att) => ({
            filename: att.filename,
            content: att.content,
            encoding: att.encoding || 'base64',
            contentType: att.contentType || 'application/pdf'
          }));
        }

        await transporter.sendMail(mailOptions);
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
    return res.status(500).json({ error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' });
  }
};
