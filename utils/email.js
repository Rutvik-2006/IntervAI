const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transportConfig = {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 2525,
  };

  if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    transportConfig.auth = {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    };
  } else {
    console.warn('SMTP Email credentials not configured. Emails will be logged but not sent.');
  }

  const transporter = nodemailer.createTransport(transportConfig);

  const mailOptions = {
    from: `AI InterviewOS Support <${process.env.EMAIL_FROM || 'support@ai-interviewos.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    await transporter.sendMail(mailOptions);
  } else {
    console.log('--- LOCAL DEV EMAIL DISPATCH ---');
    console.log(`To: ${mailOptions.to}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body: ${mailOptions.text}`);
    console.log('--------------------------------');
  }
};

module.exports = sendEmail;
