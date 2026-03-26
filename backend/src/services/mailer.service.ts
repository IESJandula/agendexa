import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@agendexa.local';

const hasSmtpConfig = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = hasSmtpConfig
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    })
    : null;

export const sendMail = async (params: {
    to: string;
    subject: string;
    text: string;
    html: string;
}) => {
    const { to, subject, text, html } = params;

    if (!transporter) {
        console.warn(`[mail-disabled] To: ${to} | Subject: ${subject}`);
        return { sent: false, skipped: true };
    }

    await transporter.sendMail({
        from: MAIL_FROM,
        to,
        subject,
        text,
        html
    });

    return { sent: true, skipped: false };
};
