"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAppointmentReminderEmail = exports.sendAppointmentConfirmationEmail = void 0;
const mailer_service_1 = require("./mailer.service");
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const EMAIL_FONT_STACK = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const formatDateTime = (value) => {
    return value.toLocaleString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
const sendAppointmentConfirmationEmail = async (params) => {
    const { to, clientName, businessName, serviceName, staffName, startDate, confirmationToken } = params;
    const confirmUrl = `${API_BASE_URL}/public/appointments/confirm?token=${encodeURIComponent(confirmationToken)}`;
    const when = formatDateTime(startDate);
    const subject = `Confirma tu cita en ${businessName}`;
    const text = [
        `Hola ${clientName},`,
        '',
        `Hemos recibido tu solicitud de cita para ${serviceName} con ${staffName}.`,
        `Fecha y hora: ${when}.`,
        '',
        'Para confirmar tu cita haz clic en este enlace:',
        confirmUrl,
        '',
        'Si no confirmas, la cita seguira en estado pendiente.'
    ].join('\n');
    const html = `
        <div style="font-family:${EMAIL_FONT_STACK}; line-height:1.5; color:#111; max-width:620px; margin:auto;">
            <h2>Confirma tu cita</h2>
            <p>Hola <strong>${clientName}</strong>,</p>
            <p>Hemos recibido tu solicitud de cita para <strong>${serviceName}</strong> con <strong>${staffName}</strong>.</p>
            <p><strong>Fecha y hora:</strong> ${when}</p>
            <p>
                <a href="${confirmUrl}" style="display:inline-block; padding:10px 16px; background:#39CB69; color:#000; text-decoration:none; font-weight:700; border-radius:6px;">
                    Confirmar cita
                </a>
            </p>
            <p>Si no confirmas, la cita seguira en estado pendiente.</p>
        </div>
    `;
    return (0, mailer_service_1.sendMail)({ to, subject, text, html });
};
exports.sendAppointmentConfirmationEmail = sendAppointmentConfirmationEmail;
const sendAppointmentReminderEmail = async (params) => {
    const { to, clientName, businessName, serviceName, staffName, startDate } = params;
    const when = formatDateTime(startDate);
    const subject = `Recordatorio: tu cita es en 24 horas (${businessName})`;
    const text = [
        `Hola ${clientName},`,
        '',
        `Te recordamos que tu cita en ${businessName} es en menos de 24 horas.`,
        `Servicio: ${serviceName}`,
        `Profesional: ${staffName}`,
        `Fecha y hora: ${when}`,
        '',
        'Si necesitas cambios, contacta con el negocio cuanto antes.'
    ].join('\n');
    const html = `
        <div style="font-family:${EMAIL_FONT_STACK}; line-height:1.5; color:#111; max-width:620px; margin:auto;">
            <h2>Recordatorio de cita</h2>
            <p>Hola <strong>${clientName}</strong>,</p>
            <p>Te recordamos que tu cita en <strong>${businessName}</strong> es en menos de 24 horas.</p>
            <ul>
                <li><strong>Servicio:</strong> ${serviceName}</li>
                <li><strong>Profesional:</strong> ${staffName}</li>
                <li><strong>Fecha y hora:</strong> ${when}</li>
            </ul>
            <p>Si necesitas cambios, contacta con el negocio cuanto antes.</p>
        </div>
    `;
    return (0, mailer_service_1.sendMail)({ to, subject, text, html });
};
exports.sendAppointmentReminderEmail = sendAppointmentReminderEmail;
