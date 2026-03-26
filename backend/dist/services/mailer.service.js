"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@agendexa.local';
const hasSmtpConfig = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const transporter = hasSmtpConfig
    ? nodemailer_1.default.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    })
    : null;
const sendMail = async (params) => {
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
exports.sendMail = sendMail;
