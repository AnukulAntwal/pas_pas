import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Add timeout settings
  connectionTimeout: 50000, // 10 seconds
  greetingTimeout: 50000,
  socketTimeout: 50000
});


export const sendOTPEmail = async (email, otp) => {
console.log('Preparing to send OTP email to:', process.env.EMAIL_USER);  
  const mailOptions = {
    from: `PasPas App Reset Link <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset OTP - Pas Pas App Platform',
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 30px 0;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

      <!-- Header -->
      <div style="background: linear-gradient(90deg, #4e73df, #1cc88a); padding: 20px 30px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px;">
          Pas Pas App Platform
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #555; line-height: 1.6;">
          You requested to reset your password. Please use the OTP below to continue.
        </p>

        <!-- OTP Box -->
        <div style="background-color: #f8f9fc; border: 2px dashed #4e73df; 
                    padding: 20px; text-align: center; font-size: 32px; 
                    font-weight: bold; letter-spacing: 8px; 
                    margin: 25px 0; border-radius: 8px; color: #4e73df;">
          ${otp}
        </div>

        <p style="color: #666; font-size: 14px;">
          This OTP will expire in <strong>5 minutes</strong>.
        </p>

        <p style="color: #888; font-size: 13px;">
          If you did not request a password reset, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px 30px; 
                  border-top: 1px solid #e3e6f0; font-size: 13px; 
                  color: #999; text-align: left;">

        <strong style="color: #555;">Platform:</strong> PasPas App <br/>
        <strong style="color: #555;">Contact Us</strong> <br/>
        Email: support@paspaspackage.com <br/><br/>
        Last updated: 27 October 2025

      </div>

    </div>
  </div>
`
  };

  try {
    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout')), 15000)
    );

    const sendPromise = transporter.sendMail(mailOptions);

    await Promise.race([sendPromise, timeoutPromise]);
    
    return { status: "success", message: 'OTP sent successfully' };
  } catch (error) {
    console.error('Email error:', error);
    throw new Error('Failed to send OTP email');
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
