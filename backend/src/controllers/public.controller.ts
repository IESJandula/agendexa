import { Request, Response } from 'express';
import { prisma } from '../index';

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

        const targetDate = new Date(String(date));
        const dayOfWeek = targetDate.getUTCDay();

        // Find schedule for this day
        const schedule = await prisma.schedule.findFirst({
            where: { staff_id: String(staffId), day_of_week: dayOfWeek }
        });

        if (!schedule) {
            return res.json([]); // No slots if no schedule
        }

        // Get timeoffs for this day
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

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

        let currentSlotH = startH;
        let currentSlotM = startM;

        while (currentSlotH < endH || (currentSlotH === endH && currentSlotM < endM)) {
            const slotStart = new Date(targetDate);
            slotStart.setUTCHours(currentSlotH, currentSlotM, 0, 0);

            const slotEnd = new Date(slotStart.getTime() + durationMin * 60000);

            const scheduleEnd = new Date(targetDate);
            scheduleEnd.setUTCHours(endH, endM, 0, 0);

            // Is duration fitting inside schedule?
            if (slotEnd.getTime() <= scheduleEnd.getTime()) {
                // Is future?
                if (slotStart.getTime() > now.getTime()) {
                    // Check overlap with time-offs
                    const overlapsTimeOff = timeOffs.some(toff =>
                        slotStart.getTime() < toff.end_datetime_utc.getTime() &&
                        slotEnd.getTime() > toff.start_datetime_utc.getTime()
                    );

                    if (!overlapsTimeOff) {
                        // Check overlap with appointments
                        const overlapsAppt = appointments.some(appt =>
                            slotStart.getTime() < appt.end_datetime_utc.getTime() &&
                            slotEnd.getTime() > appt.start_datetime_utc.getTime()
                        );

                        if (!overlapsAppt) {
                            slots.push(slotStart.toISOString());
                        }
                    }
                }
            }

            // Increment by interval
            currentSlotM += intervalMin;
            if (currentSlotM >= 60) {
                currentSlotH += Math.floor(currentSlotM / 60);
                currentSlotM = currentSlotM % 60;
            }
        }

        return res.json(slots);
    } catch (error) {
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
