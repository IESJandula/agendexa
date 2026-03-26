"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAppointmentReminderJob = void 0;
const booking_mail_service_1 = require("./booking-mail.service");
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const processReminderWindow = async (prisma) => {
    const now = new Date();
    const targetStart = new Date(now.getTime() + (24 * 60 * 60 * 1000) - (7 * 60 * 1000));
    const targetEnd = new Date(now.getTime() + (24 * 60 * 60 * 1000) + (7 * 60 * 1000));
    const appointments = await prisma.appointment.findMany({
        where: {
            status: 'CONFIRMED',
            reminder_sent_at: null,
            start_datetime_utc: {
                gte: targetStart,
                lte: targetEnd
            }
        },
        include: {
            business: { select: { name: true } },
            service: { select: { name: true } },
            staff: { include: { user: { select: { name: true } } } },
            client: { include: { user: { select: { email: true, name: true } } } }
        }
    });
    for (const appointment of appointments) {
        const clientEmail = appointment.client?.user?.email;
        if (!clientEmail)
            continue;
        try {
            await (0, booking_mail_service_1.sendAppointmentReminderEmail)({
                to: clientEmail,
                clientName: appointment.client?.user?.name || 'Cliente',
                businessName: appointment.business.name,
                serviceName: appointment.service.name,
                staffName: appointment.staff.user.name,
                startDate: appointment.start_datetime_utc
            });
            await prisma.appointment.update({
                where: { id: appointment.id },
                data: { reminder_sent_at: new Date() }
            });
        }
        catch (error) {
            console.error(`Failed to send reminder for appointment ${appointment.id}`, error);
        }
    }
};
const startAppointmentReminderJob = (prisma) => {
    processReminderWindow(prisma).catch((err) => {
        console.error('Initial reminder run failed', err);
    });
    setInterval(() => {
        processReminderWindow(prisma).catch((err) => {
            console.error('Reminder run failed', err);
        });
    }, FIFTEEN_MINUTES_MS);
};
exports.startAppointmentReminderJob = startAppointmentReminderJob;
