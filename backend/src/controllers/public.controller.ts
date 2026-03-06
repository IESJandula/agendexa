import { Request, Response } from 'express';
import { prisma } from '../index';

export const searchBusinesses = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string || '';
        const businesses = await prisma.business.findMany({
            where: {
                name: {
                    contains: query
                }
            },
            select: {
                id: true,
                name: true,
                slug: true
            },
            take: 10
        });
        return res.json(businesses);
    } catch (error) {
        console.error('Error searching businesses:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPublicServices = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const business = await prisma.business.findUnique({ where: { slug } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        const services = await prisma.service.findMany({
            where: { business_id: business.id, is_active: true }
        });
        return res.json(services);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPublicStaff = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const { serviceId } = req.query;

        const business = await prisma.business.findUnique({ where: { slug } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        let staffProfiles = [];
        if (serviceId) {
            staffProfiles = await prisma.staffProfile.findMany({
                where: { business_id: business.id, is_active: true, services: { some: { service_id: String(serviceId) } } },
                include: { user: { select: { name: true, id: true } } }
            });
        } else {
            staffProfiles = await prisma.staffProfile.findMany({
                where: { business_id: business.id, is_active: true },
                include: { user: { select: { name: true, id: true } } }
            });
        }

        return res.json(staffProfiles);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAvailability = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, date } = req.query; // date in YYYY-MM-DD

        if (!serviceId || !staffId || !date) {
            return res.status(400).json({ error: 'serviceId, staffId, and date are required' });
        }

        const business = await prisma.business.findUnique({ where: { slug } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
        if (!service) return res.status(404).json({ error: 'Service not found' });

        const targetDate = new Date(`${String(date)}T00:00:00`);
        const dayOfWeek = targetDate.getDay();

        // Find schedule for this day
        const schedule = await prisma.schedule.findFirst({
            where: { staff_id: String(staffId), day_of_week: dayOfWeek }
        });

        if (!schedule) {
            return res.json([]); // No slots if no schedule
        }

        // Get timeoffs for this day
        const startOfDay = new Date(`${String(date)}T00:00:00`);
        const endOfDay = new Date(`${String(date)}T23:59:59.999`);

        const timeOffs = await prisma.timeOff.findMany({
            where: {
                staff_id: String(staffId),
                start_datetime_utc: { lte: endOfDay },
                end_datetime_utc: { gte: startOfDay }
            }
        });

        // Get appointments
        const appointments = await prisma.appointment.findMany({
            where: {
                staff_id: String(staffId),
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                start_datetime_utc: { lte: endOfDay },
                end_datetime_utc: { gte: startOfDay }
            }
        });

        // Generate grid slots
        const intervalMin = business.slot_interval_minutes;
        const durationMin = service.duration_min;

        // Parse start and end time (assuming HH:mm format)
        const [startH, startM] = schedule.start_time.split(':').map(Number);
        const [endH, endM] = schedule.end_time.split(':').map(Number);

        const slots = [];
        const now = new Date();

        const candidateTimes = new Set<string>(); // HH:mm format

        let currentSlotH = startH;
        let currentSlotM = startM;
        while (currentSlotH < endH || (currentSlotH === endH && currentSlotM < endM)) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            candidateTimes.add(`${pad(currentSlotH)}:${pad(currentSlotM)}`);
            currentSlotM += intervalMin;
            if (currentSlotM >= 60) {
                currentSlotH += Math.floor(currentSlotM / 60);
                currentSlotM = currentSlotM % 60;
            }
        }

        // Add dynamic end times to snap to gaps perfectly
        appointments.forEach(appt => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            candidateTimes.add(`${pad(appt.end_datetime_utc.getHours())}:${pad(appt.end_datetime_utc.getMinutes())}`);
        });

        timeOffs.forEach(toff => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            candidateTimes.add(`${pad(toff.end_datetime_utc.getHours())}:${pad(toff.end_datetime_utc.getMinutes())}`);
        });

        const sortedCandidates = Array.from(candidateTimes).sort();

        const pad = (n: number) => n.toString().padStart(2, '0');
        const scheduleEnd = new Date(`${String(date)}T${pad(endH)}:${pad(endM)}:00`);

        for (const hm of sortedCandidates) {
            const [cH, cM] = hm.split(':').map(Number);

            // Discard if outside schedule bounds
            if (cH < startH || (cH === startH && cM < startM)) continue;
            if (cH > endH || (cH === endH && cM >= endM)) continue;

            const slotStart = new Date(`${String(date)}T${pad(cH)}:${pad(cM)}:00`);
            const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

            if (slotEnd.getTime() <= scheduleEnd.getTime()) {
                if (slotStart.getTime() > now.getTime()) {
                    const overlapsTimeOff = timeOffs.some(toff =>
                        slotStart.getTime() < toff.end_datetime_utc.getTime() &&
                        slotEnd.getTime() > toff.start_datetime_utc.getTime()
                    );

                    if (!overlapsTimeOff) {
                        const overlapsAppt = appointments.some(appt =>
                            slotStart.getTime() < appt.end_datetime_utc.getTime() &&
                            slotEnd.getTime() > appt.start_datetime_utc.getTime()
                        );

                        if (!overlapsAppt) {
                            // Convert the slot to a proper ISO string ensuring we DO NOT lose the zero-padding formatting
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const localString = `${String(date).split('T')[0]}T${pad(cH)}:${pad(cM)}:00`;
                            slots.push(localString);
                        }
                    }
                }
            }
        }

        return res.json(slots);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMonthlyAvailability = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, year, month } = req.query; // year: YYYY, month: MM

        if (!serviceId || !staffId || !year || !month) {
            return res.status(400).json({ error: 'serviceId, staffId, year, and month are required' });
        }

        const business = await prisma.business.findUnique({ where: { slug } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
        if (!service) return res.status(404).json({ error: 'Service not found' });

        const yearNum = parseInt(String(year), 10);
        const monthNum = parseInt(String(month), 10) - 1; // JS months are 0-indexed

        // Get all schedules for this staff to know which days they work
        const schedules = await prisma.schedule.findMany({
            where: { staff_id: String(staffId) }
        });

        if (schedules.length === 0) {
            return res.json({}); // No schedule -> no availability
        }

        // Object map for fast lookup of schedules by dayOfWeek
        const scheduleMap: Record<number, any> = {};
        schedules.forEach(s => scheduleMap[s.day_of_week] = s);

        const startDate = new Date(yearNum, monthNum, 1, 0, 0, 0);
        const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

        const timeOffs = await prisma.timeOff.findMany({
            where: {
                staff_id: String(staffId),
                start_datetime_utc: { lte: endDate },
                end_datetime_utc: { gte: startDate }
            }
        });

        const appointments = await prisma.appointment.findMany({
            where: {
                staff_id: String(staffId),
                status: { in: ['CONFIRMED', 'COMPLETED'] },
                start_datetime_utc: { lte: endDate },
                end_datetime_utc: { gte: startDate }
            }
        });

        const intervalMin = business.slot_interval_minutes;
        const durationMin = service.duration_min;
        const now = new Date();

        const daysInMonth = endDate.getUTCDate();
        const availabilityMap: Record<string, boolean> = {};

        for (let day = 1; day <= daysInMonth; day++) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            const dateString = `${yearNum}-${pad(monthNum + 1)}-${pad(day)}`;

            const targetDate = new Date(`${dateString}T00:00:00`);
            const dayOfWeek = targetDate.getDay();

            const schedule = scheduleMap[dayOfWeek];
            if (!schedule || targetDate.getTime() + 86400000 < now.getTime()) {
                // No schedule for this day or date is in the past
                availabilityMap[dateString] = false;
                continue;
            }

            // Check if there is AT LEAST ONE slot available this day
            const [startH, startM] = schedule.start_time.split(':').map(Number);
            const [endH, endM] = schedule.end_time.split(':').map(Number);

            const candidateTimes = new Set<string>();

            let currentSlotH = startH;
            let currentSlotM = startM;
            while (currentSlotH < endH || (currentSlotH === endH && currentSlotM < endM)) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                candidateTimes.add(`${pad(currentSlotH)}:${pad(currentSlotM)}`);
                currentSlotM += intervalMin;
                if (currentSlotM >= 60) {
                    currentSlotH += Math.floor(currentSlotM / 60);
                    currentSlotM = currentSlotM % 60;
                }
            }

            const targetDayStart = new Date(`${dateString}T00:00:00`);
            const targetDayEnd = new Date(`${dateString}T23:59:59.999`);

            appointments.filter(a => a.end_datetime_utc >= targetDayStart && a.end_datetime_utc <= targetDayEnd).forEach(appt => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                candidateTimes.add(`${pad(appt.end_datetime_utc.getHours())}:${pad(appt.end_datetime_utc.getMinutes())}`);
            });

            timeOffs.filter(t => t.end_datetime_utc >= targetDayStart && t.end_datetime_utc <= targetDayEnd).forEach(toff => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                candidateTimes.add(`${pad(toff.end_datetime_utc.getHours())}:${pad(toff.end_datetime_utc.getMinutes())}`);
            });

            const sortedCandidates = Array.from(candidateTimes).sort();

            let hasSlot = false;

            const scheduleEnd = new Date(`${dateString}T${pad(endH)}:${pad(endM)}:00`);

            for (const hm of sortedCandidates) {
                const [cH, cM] = hm.split(':').map(Number);
                if (cH < startH || (cH === startH && cM < startM)) continue;
                if (cH > endH || (cH === endH && cM >= endM)) continue;

                const slotStart = new Date(`${dateString}T${pad(cH)}:${pad(cM)}:00`);
                const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

                if (slotEnd.getTime() <= scheduleEnd.getTime()) {
                    if (slotStart.getTime() > now.getTime()) {
                        const overlapsTimeOff = timeOffs.some(toff =>
                            slotStart.getTime() < toff.end_datetime_utc.getTime() &&
                            slotEnd.getTime() > toff.start_datetime_utc.getTime()
                        );

                        if (!overlapsTimeOff) {
                            const overlapsAppt = appointments.some(appt =>
                                slotStart.getTime() < appt.end_datetime_utc.getTime() &&
                                slotEnd.getTime() > appt.start_datetime_utc.getTime()
                            );

                            if (!overlapsAppt) {
                                hasSlot = true;
                                break; // We just need to know if at least one exists
                            }
                        }
                    }
                }
            }
            availabilityMap[dateString] = hasSlot;
        }

        return res.json(availabilityMap);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const bookAppointment = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const { serviceId, staffId, startDatetimeUtc, clientName, clientEmail, clientPhone } = req.body;

        const business = await prisma.business.findUnique({ where: { slug } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ error: 'Service not found' });

        const slotStart = new Date(startDatetimeUtc);
        const slotEnd = new Date(slotStart.getTime() + service.duration_min * 60000);

        // Concurrency check using transactions
        const result = await prisma.$transaction(async (tx) => {
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

            // Let's create a Client User and their ClientProfile!
            let clientUser = await tx.user.findUnique({ where: { email: clientEmail } });
            if (!clientUser) {
                clientUser = await tx.user.create({
                    data: {
                        email: clientEmail,
                        name: clientName,
                        password_hash: '', // No login required for guest
                        role: 'CLIENT'
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
                    status: 'CONFIRMED'
                }
            });

            return newAppt;
        });

        return res.status(201).json(result);
    } catch (error: any) {
        if (error.message.includes('overlap')) {
            return res.status(409).json({ error: error.message });
        }
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
