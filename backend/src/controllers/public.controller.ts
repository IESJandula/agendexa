import { Request, Response } from 'express';
import { prisma } from '../index';

type TimeRange = {
    startMinutes: number;
    endMinutes: number;
};

const pad = (n: number) => n.toString().padStart(2, '0');

const hhmmToMinutes = (value: string): number => {
    const [h, m] = value.split(':').map(Number);
    return (h * 60) + m;
};

const minutesToIsoLocal = (dateString: string, minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${dateString}T${pad(h)}:${pad(m)}:00`;
};

const minutesToDate = (dateString: string, minutes: number): Date => {
    return new Date(minutesToIsoLocal(dateString, minutes));
};

const normalizeRanges = (schedules: Array<{ start_time: string; end_time: string }>): TimeRange[] => {
    return schedules
        .map((s) => ({
            startMinutes: hhmmToMinutes(s.start_time),
            endMinutes: hhmmToMinutes(s.end_time)
        }))
        .filter((r) => r.startMinutes < r.endMinutes)
        .sort((a, b) => a.startMinutes - b.startMinutes);
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean => {
    return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
};

const slotFitsAnyRange = (slotStartMinutes: number, slotEndMinutes: number, ranges: TimeRange[]): boolean => {
    return ranges.some((r) => slotStartMinutes >= r.startMinutes && slotEndMinutes <= r.endMinutes);
};

const buildCandidateMinutes = (
    ranges: TimeRange[],
    intervalMin: number,
    appointments: Array<{ end_datetime_utc: Date }>,
    timeOffs: Array<{ end_datetime_utc: Date }>
): number[] => {
    const candidates = new Set<number>();

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

const computeAvailableSlots = (params: {
    dateString: string;
    ranges: TimeRange[];
    intervalMin: number;
    durationMin: number;
    now: Date;
    appointments: Array<{ start_datetime_utc: Date; end_datetime_utc: Date }>;
    timeOffs: Array<{ start_datetime_utc: Date; end_datetime_utc: Date }>;
}): string[] => {
    const { dateString, ranges, intervalMin, durationMin, now, appointments, timeOffs } = params;
    const slots: string[] = [];

    if (!ranges.length) return slots;

    const candidateMinutes = buildCandidateMinutes(ranges, intervalMin, appointments, timeOffs);

    for (const startMin of candidateMinutes) {
        const endMin = startMin + durationMin;

        if (!slotFitsAnyRange(startMin, endMin, ranges)) continue;

        const slotStart = minutesToDate(dateString, startMin);
        const slotEnd = new Date(slotStart.getTime() + (durationMin * 60000));

        if (slotStart.getTime() <= now.getTime()) continue;

        const overlapsTimeOff = timeOffs.some((toff) =>
            overlaps(slotStart, slotEnd, toff.start_datetime_utc, toff.end_datetime_utc)
        );
        if (overlapsTimeOff) continue;

        const overlapsAppt = appointments.some((appt) =>
            overlaps(slotStart, slotEnd, appt.start_datetime_utc, appt.end_datetime_utc)
        );
        if (overlapsAppt) continue;

        slots.push(minutesToIsoLocal(dateString, startMin));
    }

    return slots;
};

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

        // Turno partido support: multiple schedule ranges for the same weekday.
        const daySchedules = await prisma.schedule.findMany({
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

        // Object map for fast lookup of ALL schedule ranges by dayOfWeek.
        const scheduleMap: Record<number, TimeRange[]> = {};
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

            const dayRanges = scheduleMap[dayOfWeek];
            if (!dayRanges.length || targetDate.getTime() + 86400000 < now.getTime()) {
                // No schedule for this day or date is in the past
                availabilityMap[dateString] = false;
                continue;
            }

            const targetDayStart = new Date(`${dateString}T00:00:00`);
            const targetDayEnd = new Date(`${dateString}T23:59:59.999`);

            const dayAppointments = appointments.filter((a) =>
                a.start_datetime_utc <= targetDayEnd && a.end_datetime_utc >= targetDayStart
            );
            const dayTimeOffs = timeOffs.filter((t) =>
                t.start_datetime_utc <= targetDayEnd && t.end_datetime_utc >= targetDayStart
            );

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
