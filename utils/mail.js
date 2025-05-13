const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    const response = await resend.emails.send({
      from: 'onboarding@bipingupta.site',
      to,
      subject,
      html,
    });

    console.log('Email sent:', response);
    return true;
  } catch (error) {
    console.error('Email sending error:', error?.message || error);
    return false;
  }
};

module.exports = sendEmail;
