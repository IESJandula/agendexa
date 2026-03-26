"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmAppointmentByToken = exports.bookAppointment = exports.getMonthlyAvailability = exports.getAvailability = exports.getPublicStaff = exports.getPublicServices = exports.searchBusinesses = void 0;
const index_1 = require("../index");
const crypto_1 = require("crypto");
const booking_mail_service_1 = require("../services/booking-mail.service");
const pad = (n) => n.toString().padStart(2, '0');
const hhmmToMinutes = (value) => {
    const [h, m] = value.split(':').map(Number);
    return (h * 60) + m;
};
const minutesToIsoLocal = (dateString, minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${dateString}T${pad(h)}:${pad(m)}:00`;
};
const minutesToDate = (dateString, minutes) => {
    return new Date(minutesToIsoLocal(dateString, minutes));
};
const normalizeRanges = (schedules) => {
    return schedules
        .map((s) => ({
        startMinutes: hhmmToMinutes(s.start_time),
        endMinutes: hhmmToMinutes(s.end_time)
    }))
        .filter((r) => r.startMinutes < r.endMinutes)
        .sort((a, b) => a.startMinutes - b.startMinutes);
};
const overlaps = (aStart, aEnd, bStart, bEnd) => {
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
};
const slotFitsAnyRange = (slotStartMinutes, slotEndMinutes, ranges) => {
    return ranges.some((r) => slotStartMinutes >= r.startMinutes && slotEndMinutes <= r.endMinutes);
};
const buildCandidateMinutes = (ranges, intervalMin, appointments, timeOffs) => {
    const candidates = new Set();
    for (const range of ranges) {
        for (let minute = range.startMinutes; minute < range.endMinutes; minute += intervalMin) {
            candidates.add(minute);
        }
    }
    for (const appt of appointments) {
        candidates.add(appt.end_datetime_utc.getHours() * 60 + appt.end_datetime_utc.getMinutes());
    }
    for (const toff of timeOffs) {
        candidates.add(toff.end_datetime_utc.getHours() * 60 + toff.end_datetime_utc.getMinutes());
    }
    return Array.from(candidates).sort((a, b) => a - b);
};
const computeAvailableSlots = (params) => {
    const { dateString, ranges, intervalMin, durationMin, now, appointments, timeOffs } = params;
    const slots = [];
    if (!ranges.length)
        return slots;
    const candidateMinutes = buildCandidateMinutes(ranges, intervalMin, appointments, timeOffs);
    for (const startMin of candidateMinutes) {
        const endMin = startMin + durationMin;
        if (!slotFitsAnyRange(startMin, endMin, ranges))
            continue;
        const slotStart = minutesToDate(dateString, startMin);
        const slotEnd = new Date(slotStart.getTime() + (durationMin * 60000));
        if (slotStart.getTime() <= now.getTime())
            continue;
        const overlapsTimeOff = timeOffs.some((toff) => overlaps(slotStart, slotEnd, toff.start_datetime_utc, toff.end_datetime_utc));
        if (overlapsTimeOff)
            continue;
        const overlapsAppt = appointments.some((appt) => overlaps(slotStart, slotEnd, appt.start_datetime_utc, appt.end_datetime_utc));
        if (overlapsAppt)
            continue;
        slots.push(minutesToIsoLocal(dateString, startMin));
    }
    return slots;
};
const searchBusinesses = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        const searchBy = req.query.by === 'location' ? 'location' : 'name';
        if (!query) {
            return res.json([]);
        }
        const businesses = await index_1.prisma.business.findMany({
            where: searchBy === 'location'
                ? {
                    location: {
                        contains: query
                    }
                }
                : {
                    name: {
                        contains: query
                    }
                },
            select: {
                id: true,
                name: true,
                slug: true,
                location: true
            },
            take: 20
        });
        return res.json(businesses);
    }
    catch (error) {
        console.error('Error searching businesses:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.searchBusinesses = searchBusinesses;
const getPublicServices = async (req, res) => {
    try {
        const { slug } = req.params;
        const business = await index_1.prisma.business.findUnique({ where: { slug } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        const services = await index_1.prisma.service.findMany({
            where: { business_id: business.id, is_active: true }
        });
        return res.json(services);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPublicServices = getPublicServices;
const getPublicStaff = async (req, res) => {
    try {
        const { slug } = req.params;
        const { serviceId } = req.query;
        const business = await index_1.prisma.business.findUnique({ where: { slug } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        let staffProfiles = [];
        if (serviceId) {
            staffProfiles = await index_1.prisma.staffProfile.findMany({
                where: { business_id: business.id, is_active: true, services: { some: { service_id: String(serviceId) } } },
                include: { user: { select: { name: true, id: true } } }
            });
        }
        else {
            staffProfiles = await index_1.prisma.staffProfile.findMany({
                where: { business_id: business.id, is_active: true },
                include: { user: { select: { name: true, id: true } } }
            });
        }
        return res.json(staffProfiles);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getPublicStaff = getPublicStaff;
const getAvailability = async (req, res) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, date } = req.query; // date in YYYY-MM-DD
        if (!serviceId || !staffId || !date) {
            return res.status(400).json({ error: 'serviceId, staffId, and date are required' });
        }
        const business = await index_1.prisma.business.findUnique({ where: { slug } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        const service = await index_1.prisma.service.findUnique({ where: { id: String(serviceId) } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const targetDate = new Date(`${String(date)}T00:00:00`);
        const dayOfWeek = targetDate.getDay();
        // Turno partido support: multiple schedule ranges for the same weekday.
        const daySchedules = await index_1.prisma.schedule.findMany({
            where: { staff_id: String(staffId), day_of_week: dayOfWeek },
            orderBy: { start_time: 'asc' }
        });
        const ranges = normalizeRanges(daySchedules);
        if (!ranges.length) {
            return res.json([]); // No slots if no schedule
        }
        // Get timeoffs for this day
        const startOfDay = new Date(`${String(date)}T00:00:00`);
        const endOfDay = new Date(`${String(date)}T23:59:59.999`);
        const timeOffs = await index_1.prisma.timeOff.findMany({
            where: {
                staff_id: String(staffId),
                start_datetime_utc: { lte: endOfDay },
                end_datetime_utc: { gte: startOfDay }
            }
        });
        // Get appointments
        const appointments = await index_1.prisma.appointment.findMany({
            where: {
                staff_id: String(staffId),
                status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED'] },
                start_datetime_utc: { lte: endOfDay },
                end_datetime_utc: { gte: startOfDay }
            }
        });
        const intervalMin = business.slot_interval_minutes;
        const durationMin = service.duration_min;
        const now = new Date();
        const dateString = String(date).split('T')[0];
        const slots = computeAvailableSlots({
            dateString,
            ranges,
            intervalMin,
            durationMin,
            now,
            appointments,
            timeOffs
        });
        return res.json(slots);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAvailability = getAvailability;
const getMonthlyAvailability = async (req, res) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, year, month } = req.query; // year: YYYY, month: MM
        if (!serviceId || !staffId || !year || !month) {
            return res.status(400).json({ error: 'serviceId, staffId, year, and month are required' });
        }
        const business = await index_1.prisma.business.findUnique({ where: { slug } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        const service = await index_1.prisma.service.findUnique({ where: { id: String(serviceId) } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const yearNum = parseInt(String(year), 10);
        const monthNum = parseInt(String(month), 10) - 1; // JS months are 0-indexed
        // Get all schedules for this staff to know which days they work
        const schedules = await index_1.prisma.schedule.findMany({
            where: { staff_id: String(staffId) }
        });
        if (schedules.length === 0) {
            return res.json({}); // No schedule -> no availability
        }
        // Object map for fast lookup of ALL schedule ranges by dayOfWeek.
        const scheduleMap = {};
        for (let day = 0; day <= 6; day++) {
            scheduleMap[day] = [];
        }
        for (const schedule of schedules) {
            const range = normalizeRanges([schedule]);
            if (range.length) {
                scheduleMap[schedule.day_of_week].push(range[0]);
            }
        }
        for (let day = 0; day <= 6; day++) {
            scheduleMap[day].sort((a, b) => a.startMinutes - b.startMinutes);
        }
        const startDate = new Date(yearNum, monthNum, 1, 0, 0, 0);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);
        const timeOffs = await index_1.prisma.timeOff.findMany({
            where: {
                staff_id: String(staffId),
                start_datetime_utc: { lte: endDate },
                end_datetime_utc: { gte: startDate }
            }
        });
        const appointments = await index_1.prisma.appointment.findMany({
            where: {
                staff_id: String(staffId),
                status: { in: ['PENDING_CONFIRMATION', 'CONFIRMED', 'COMPLETED'] },
                start_datetime_utc: { lte: endDate },
                end_datetime_utc: { gte: startDate }
            }
        });
        const intervalMin = business.slot_interval_minutes;
        const durationMin = service.duration_min;
        const now = new Date();
        const daysInMonth = endDate.getUTCDate();
        const availabilityMap = {};
        for (let day = 1; day <= daysInMonth; day++) {
            const pad = (n) => n.toString().padStart(2, '0');
            const dateString = `${yearNum}-${pad(monthNum + 1)}-${pad(day)}`;
            const targetDate = new Date(`${dateString}T00:00:00`);
            const dayOfWeek = targetDate.getDay();
            const dayRanges = scheduleMap[dayOfWeek];
            if (!dayRanges.length || targetDate.getTime() + 86400000 < now.getTime()) {
                // No schedule for this day or date is in the past
                availabilityMap[dateString] = false;
                continue;
            }
            const targetDayStart = new Date(`${dateString}T00:00:00`);
            const targetDayEnd = new Date(`${dateString}T23:59:59.999`);
            const dayAppointments = appointments.filter((a) => a.start_datetime_utc <= targetDayEnd && a.end_datetime_utc >= targetDayStart);
            const dayTimeOffs = timeOffs.filter((t) => t.start_datetime_utc <= targetDayEnd && t.end_datetime_utc >= targetDayStart);
            const daySlots = computeAvailableSlots({
                dateString,
                ranges: dayRanges,
                intervalMin,
                durationMin,
                now,
                appointments: dayAppointments,
                timeOffs: dayTimeOffs
            });
            availabilityMap[dateString] = daySlots.length > 0;
        }
        return res.json(availabilityMap);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMonthlyAvailability = getMonthlyAvailability;
const bookAppointment = async (req, res) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, startDatetimeUtc, clientName, clientEmail, clientPhone } = req.body;
        if (!req.user) {
            return res.status(401).json({ error: 'Debes iniciar sesion para reservar una cita' });
        }
        const business = await index_1.prisma.business.findUnique({ where: { slug } });
        if (!business)
            return res.status(404).json({ error: 'Business not found' });
        const service = await index_1.prisma.service.findUnique({ where: { id: serviceId } });
        if (!service)
            return res.status(404).json({ error: 'Service not found' });
        const slotStart = new Date(startDatetimeUtc);
        const slotEnd = new Date(slotStart.getTime() + service.duration_min * 60000);
        const confirmationToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const requester = req.user;
        const isClientBookingOwnAppointment = requester.role === 'CLIENT';
        let targetClientUser = null;
        if (isClientBookingOwnAppointment) {
            targetClientUser = await index_1.prisma.user.findUnique({ where: { id: requester.id } });
            if (!targetClientUser || targetClientUser.role !== 'CLIENT') {
                return res.status(403).json({ error: 'Solo los clientes pueden reservar para su propia cuenta' });
            }
            if (clientEmail && String(clientEmail).trim().toLowerCase() !== requester.email.toLowerCase()) {
                return res.status(400).json({ error: 'Debes reservar con el mismo correo de tu cuenta' });
            }
        }
        else {
            targetClientUser = await index_1.prisma.user.findUnique({
                where: { email: String(clientEmail || '').trim().toLowerCase() }
            });
            if (!targetClientUser || targetClientUser.role !== 'CLIENT') {
                return res.status(400).json({ error: 'El correo indicado no corresponde a ninguna cuenta de cliente' });
            }
        }
        // Concurrency check using transactions
        const result = await index_1.prisma.$transaction(async (tx) => {
            // 1. Check existing overlap
            const overlapping = await tx.appointment.findFirst({
                where: {
                    staff_id: staffId,
                    status: { in: ['CONFIRMED', 'COMPLETED'] },
                    start_datetime_utc: { lt: slotEnd },
                    end_datetime_utc: { gt: slotStart }
                }
            });
            if (overlapping) {
                throw new Error('Slot no longer available due to overlap');
            }
            // Check time offs as well
            const overlappingTimeoff = await tx.timeOff.findFirst({
                where: {
                    staff_id: staffId,
                    start_datetime_utc: { lt: slotEnd },
                    end_datetime_utc: { gt: slotStart }
                }
            });
            if (overlappingTimeoff) {
                throw new Error('Slot overlaps with staff time-off');
            }
            // Booking is always linked to an existing client account.
            let clientUser = await tx.user.findUnique({ where: { id: targetClientUser.id } });
            if (!clientUser || clientUser.role !== 'CLIENT') {
                throw new Error('Client account not found');
            }
            if (!isClientBookingOwnAppointment && clientName && clientName.trim()) {
                await tx.user.update({
                    where: { id: clientUser.id },
                    data: {
                        name: clientName.trim(),
                        ...(clientPhone ? { phone: String(clientPhone).trim() } : {})
                    }
                });
            }
            // Upsert ClientProfile logic for this business
            let clientProfile = await tx.clientProfile.findUnique({
                where: {
                    user_id_business_id: {
                        user_id: clientUser.id,
                        business_id: business.id
                    }
                }
            });
            if (!clientProfile) {
                clientProfile = await tx.clientProfile.create({
                    data: {
                        user_id: clientUser.id,
                        business_id: business.id
                    }
                });
            }
            const newAppt = await tx.appointment.create({
                data: {
                    business_id: business.id,
                    client_id: clientProfile.id,
                    staff_id: staffId,
                    service_id: serviceId,
                    start_datetime_utc: slotStart,
                    end_datetime_utc: slotEnd,
                    status: 'PENDING_CONFIRMATION',
                    confirmation_token: confirmationToken,
                    confirmation_expires_at: slotStart
                }
            });
            return newAppt;
        });
        const fullAppointment = await index_1.prisma.appointment.findUnique({
            where: { id: result.id },
            include: {
                business: { select: { name: true } },
                service: { select: { name: true } },
                staff: { include: { user: { select: { name: true } } } },
                client: { include: { user: { select: { email: true, name: true } } } }
            }
        });
        if (fullAppointment?.client?.user?.email && fullAppointment.confirmation_token) {
            await (0, booking_mail_service_1.sendAppointmentConfirmationEmail)({
                to: fullAppointment.client.user.email,
                clientName: fullAppointment.client.user.name,
                businessName: fullAppointment.business.name,
                serviceName: fullAppointment.service.name,
                staffName: fullAppointment.staff.user.name,
                startDate: fullAppointment.start_datetime_utc,
                confirmationToken: fullAppointment.confirmation_token
            });
        }
        return res.status(201).json({
            ...result,
            bookingNotice: 'Reserva creada en estado pendiente. Hemos enviado un email para confirmar la cita.'
        });
    }
    catch (error) {
        if (error.message.includes('overlap')) {
            return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('Client account not found')) {
            return res.status(400).json({ error: 'No se encontro una cuenta de cliente valida para el correo indicado' });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.bookAppointment = bookAppointment;
const confirmAppointmentByToken = async (req, res) => {
    try {
        const token = String(req.query.token || '').trim();
        if (!token) {
            return res.status(400).send('<h2>Token de confirmacion no valido.</h2>');
        }
        const appointment = await index_1.prisma.appointment.findUnique({
            where: { confirmation_token: token }
        });
        if (!appointment) {
            return res.status(404).send('<h2>La reserva no existe o ya fue confirmada.</h2>');
        }
        if (appointment.status === 'CONFIRMED') {
            return res.status(200).send('<h2>Tu cita ya estaba confirmada.</h2>');
        }
        if (appointment.status !== 'PENDING_CONFIRMATION') {
            return res.status(400).send('<h2>Esta cita no se puede confirmar en su estado actual.</h2>');
        }
        if (appointment.confirmation_expires_at && appointment.confirmation_expires_at.getTime() < Date.now()) {
            return res.status(410).send('<h2>El enlace de confirmacion ha caducado.</h2>');
        }
        await index_1.prisma.appointment.update({
            where: { id: appointment.id },
            data: {
                status: 'CONFIRMED',
                confirmed_at: new Date(),
                confirmation_token: null
            }
        });
        return res.status(200).send('<h2>Cita confirmada correctamente.</h2><p>Ya puedes cerrar esta ventana.</p>');
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h2>Error interno al confirmar la cita.</h2>');
    }
};
exports.confirmAppointmentByToken = confirmAppointmentByToken;
