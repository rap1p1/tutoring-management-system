const nodemailer = require('nodemailer');

/**
 * Tạo transporter Gmail SMTP (dùng App Password)
 * Thay thế cho Ethereal (SMTP giả lập) — gửi email thật
 */
function createTransporter() {
  // Nếu có cấu hình SMTP thật → dùng Gmail
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback: Ethereal (chỉ dùng khi dev/test, email không gửi thật)
  console.warn('⚠️  SMTP_USER/SMTP_PASS chưa cấu hình — dùng Ethereal (email không gửi thật)');
  return null;
}

/**
 * Gửi email
 * @param {object} options - { to, subject, html }
 * @returns {Promise<boolean>} true nếu gửi thành công
 */
async function sendEmail({ to, subject, html }) {
  const transporter = createTransporter();

  if (!transporter) {
    // Fallback Ethereal cho dev
    try {
      const testAccount = await nodemailer.createTestAccount();
      const etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });

      const info = await etherealTransporter.sendMail({
        from: '"Trung Tâm Gia Sư" <admin@giasu.edu.vn>',
        to,
        subject,
        html
      });
      console.log('📧 [Ethereal] Email preview:', nodemailer.getTestMessageUrl(info));
      return true;
    } catch (err) {
      console.error('Ethereal error:', err);
      return false;
    }
  }

  try {
    await transporter.sendMail({
      from: `"Trung Tâm Gia Sư" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log('✅ Đã gửi email thành công tới:', to);
    return true;
  } catch (err) {
    console.error('❌ Gửi email thất bại:', err.message);
    return false;
  }
}

module.exports = { sendEmail };
