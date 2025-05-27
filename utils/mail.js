const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const buildEmailHTML = (title, message, buttonLabel, link) => `
  <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f5f5f5;">
    <div style="max-width: 500px; margin: auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 32px;">
      <h2 style="color: #2E7D32;">${title}</h2>
      <p style="font-size: 16px; color: #444;">${message}</p>
      <a href="${link}" style="display:inline-block;margin-top:20px;padding:12px 24px;background-color:#388E3C;color:white;text-decoration:none;border-radius:5px;">
        ${buttonLabel}
      </a>
      <p style="margin-top: 30px; font-size: 12px; color: #999;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>
  </div>
`;

const sendEmail = async (to, subject, html) => {
  try {
    const response = await resend.emails.send({
      from: 'StepoTree <onboarding@bipingupta.site>',
      to,
      subject,
      html,
    });

    console.log('✅ Email sent:', response);
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error?.message || error);
    return false;
  }
};

module.exports = {
  sendEmail,
  buildEmailHTML
};
