import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import bcrypt from 'bcryptjs';

const resolveBusinessId = (req: AuthRequest): string | null => {
    if (!req.user) return null;

    if (req.user.role === 'SUPERADMIN') {
        const businessHeader = req.headers['x-business-id'];
        if (typeof businessHeader === 'string' && businessHeader.trim()) {
            return businessHeader.trim();
        }
        return null;
    }

    return req.user.business_id ?? null;
};

export const getStaff = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const staffProfiles = await prisma.staffProfile.findMany({
            where: { business_id },
            include: {
                user: { select: { id: true, name: true, email: true, created_at: true } },
                services: { select: { service: true } },
                schedules: true
            }
        });

        return res.json(staffProfiles);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

        const staffProfile = await prisma.staffProfile.findFirst({
            where: { user_id },
            include: {
                user: { select: { id: true, name: true, email: true } },
                services: { select: { service: true } },
                schedules: true,
                appointments: {
                    include: { service: true, client: { include: { user: true } } },
                    orderBy: { start_datetime_utc: 'asc' }
                }
            }
        });

        if (!staffProfile) return res.status(404).json({ error: 'Staff profile not found' });

        return res.json(staffProfile);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const createStaff = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const { name, email, password, is_active, service_ids } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password_hash: hashedPassword,
                    role: 'STAFF'
                }
            });

            const staffProfile = await tx.staffProfile.create({
                data: {
                    user_id: user.id,
                    business_id,
                    is_active: is_active ?? true
                }
            });

            if (service_ids && service_ids.length > 0) {
                await tx.staffService.createMany({
                    data: service_ids.map((service_id: string) => ({
                        staff_id: staffProfile.id,
                        service_id
                    }))
                });
            }

            return { user, staffProfile };
        });

        return res.status(201).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateStaff = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        const { id } = req.params; // StaffProfile ID
        const { is_active, service_ids } = req.body;

        const staffProfile = await prisma.staffProfile.findUnique({ where: { id } });
        if (!staffProfile || staffProfile.business_id !== business_id) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (is_active !== undefined) {
                await tx.staffProfile.update({
                    where: { id },
                    data: { is_active }
                });
            }

            if (service_ids !== undefined) {
                await tx.staffService.deleteMany({ where: { staff_id: id } });
                await tx.staffService.createMany({
                    data: service_ids.map((service_id: string) => ({
                        staff_id: id,
                        service_id
                    }))
                });
            }
            return tx.staffProfile.findUnique({ where: { id }, include: { services: true } });
        });

        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSchedule = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        const { id } = req.params; // StaffProfile ID
        const { schedules } = req.body; // Array of { day_of_week, start_time, end_time }

        const staffProfile = await prisma.staffProfile.findUnique({ where: { id } });
        if (!staffProfile || staffProfile.business_id !== business_id) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        if (req.user?.role === 'STAFF' && staffProfile.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Cannot modify other staff members' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.schedule.deleteMany({ where: { staff_id: id } });
            if (schedules && schedules.length > 0) {
                await tx.schedule.createMany({
                    data: schedules.map((s: any) => ({
                        staff_id: id,
                        day_of_week: s.day_of_week,
                        start_time: s.start_time,
                        end_time: s.end_time
                    }))
                });
            }
        });

        return res.json({ message: 'Schedule updated successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const addTimeOff = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        const { id } = req.params;
        const { start_datetime_utc, end_datetime_utc, reason } = req.body;

        if (!start_datetime_utc || !end_datetime_utc) {
            return res.status(400).json({ error: 'Start and end datetimes are required' });
        }

        const staffProfile = await prisma.staffProfile.findUnique({ where: { id } });
        if (!staffProfile || staffProfile.business_id !== business_id) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        if (req.user?.role === 'STAFF' && staffProfile.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Cannot modify other staff members' });
        }

        const timeOff = await prisma.timeOff.create({
            data: {
                staff_id: id,
                start_datetime_utc: new Date(start_datetime_utc),
                end_datetime_utc: new Date(end_datetime_utc),
                reason
            }
        });

        return res.status(201).json(timeOff);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
