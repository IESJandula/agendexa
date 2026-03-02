import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = req.user?.business_id;
        const role = req.user?.role;
        const { from, to, staffId } = req.query;

        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        let whereClause: any = { business_id };

        if (role === 'STAFF') {
            // Find staff profile associated with user
            const staffProfile = await prisma.staffProfile.findFirst({
                where: { user_id: req.user?.id }
            });
            if (!staffProfile) return res.status(403).json({ error: 'Staff profile not found' });

            whereClause.staff_id = staffProfile.id;
        } else if (staffId) {
            whereClause.staff_id = String(staffId);
        }

        if (from || to) {
            whereClause.start_datetime_utc = {};
            if (from) whereClause.start_datetime_utc.gte = new Date(String(from));
            if (to) whereClause.start_datetime_utc.lte = new Date(String(to));
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                staff: { include: { user: { select: { name: true } } } },
                service: { select: { name: true, duration_min: true, price: true } },
            },
            orderBy: { start_datetime_utc: 'asc' }
        });

        return res.json(appointments);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = req.user?.business_id;
        const role = req.user?.role;
        const { id } = req.params;
        const { status } = req.body; // 'CONFIRMED', 'COMPLETED', 'CANCELLED'

        if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const appointment = await prisma.appointment.findUnique({ where: { id } });
        if (!appointment || appointment.business_id !== business_id) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (role === 'STAFF') {
            const staffProfile = await prisma.staffProfile.findFirst({
                where: { user_id: req.user?.id }
            });
            if (appointment.staff_id !== staffProfile?.id) {
                return res.status(403).json({ error: 'Cannot modify other staff appointments' });
            }
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: { status }
        });

        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
