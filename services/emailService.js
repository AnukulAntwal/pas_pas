import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Add timeout settings
  connectionTimeout: 50000, // 10 seconds
  greetingTimeout: 50000,
  socketTimeout: 50000
});


export const sendOTPEmail = async (email, otp, purpose) => {
  console.log('Sending OTP to:', email);

  let subject = '';
  let title = '';
  let message = '';

  // 🔥 Dynamic content based on type
  if (purpose === 'account') {
    subject = 'Welcome to Paspas App - Verify Your Email';
    title = 'Hello,';
    message = `
      Thank you for creating an account with Paspas App.
      To complete your registration, please verify your email using the OTP below:
    `;
  } else if (purpose === 'reset') {
    subject = 'Reset Your Password – OTP Inside';
    title = 'Hello,';
    message = `
      We received a request to reset your password.
      Please use the OTP below to proceed:
    `;
  }

  const mailOptions = {
    from: `Paspas <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

        <!-- Header -->
        <div style="background: linear-gradient(90deg, #4e73df, #1cc88a); padding: 20px 30px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px;">
            Paspas
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <p style="color: #555;">${title}</p>
          <p style="color: #555; line-height: 1.6;">
            ${message}
          </p>

          <!-- OTP Box -->
          <div style="background-color: #f8f9fc; border: 2px dashed #4e73df; 
                      padding: 20px; text-align: center; font-size: 32px; 
                      font-weight: bold; letter-spacing: 6px; 
                      margin: 25px 0; border-radius: 8px; color: #4e73df;">
            ${otp}
          </div>

          <p style="color: #666; font-size: 14px;">
            This OTP will expire in <strong>5 minutes</strong>.
          </p>

          <p style="color: #888; font-size: 13px;">
            Do not share this OTP with anyone. If you didn’t request this, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; 
            border-top: 1px solid #e3e6f0; font-size: 13px; 
            color: #999;">
            <!-- Team Name -->
            <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px;">
              Team Paspas
            </div>

            <!-- Email with Icon -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #555;">support@paspaspackage.com</span>
            </div>

          </div>

      </div>
    </div>
    `
  };

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout')), 15000)
    );

    const sendPromise = transporter.sendMail(mailOptions);

    await Promise.race([sendPromise, timeoutPromise]);

    return { status: "success", message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Email error:', error.message);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};
// import dotenv from 'dotenv';
// import { Resend } from 'resend';
// dotenv.config();
// const resend = new Resend(process.env.RESEND_API_KEY);

// export const sendOTPEmail = async (email, otp) => {
//   try {
//     await resend.emails.send({
//       from: 'onboarding@resend.dev',
//       to: 'officework7915419@gmail.com',
//       subject: 'Password Reset OTP',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2>Password Reset Request</h2>
//           <p>Your OTP is: <strong style="font-size: 24px;">${otp}</strong></p>
//           <p>This OTP will expire in 5 minutes.</p>
//         </div>
//       `
//     });
//     return { success: true, message: 'OTP sent successfully' };
//   } catch (error) {
//     console.error('Email error:', error);
//     throw new Error('Failed to send OTP email');
//   }
// };
