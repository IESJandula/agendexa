"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointmentStatus = exports.getAppointments = void 0;
const index_1 = require("../index");
const resolveBusinessId = (req) => {
    if (!req.user)
        return null;
    if (req.user.role === 'SUPERADMIN') {
        const businessHeader = req.headers['x-business-id'];
        if (typeof businessHeader === 'string' && businessHeader.trim()) {
            return businessHeader.trim();
        }
        return null;
    }
    return req.user.business_id ?? null;
};
const getAppointments = async (req, res) => {
    try {
        const business_id = resolveBusinessId(req);
        const role = req.user?.role;
        const userId = req.user?.id;
        const { from, to, staffId } = req.query;
        let whereClause = {};
        if (role === 'CLIENT') {
            // Clients see all their own appointments across ANY business
            whereClause.client = { user_id: userId };
        }
        else {
            // Owners/Staff only see appointments for their associated business
            if (!business_id)
                return res.status(403).json({ error: 'No business associated' });
            whereClause.business_id = business_id;
            if (role === 'STAFF') {
                const staffProfile = await index_1.prisma.staffProfile.findFirst({
                    where: { user_id: userId }
                });
                if (!staffProfile)
                    return res.status(403).json({ error: 'Staff profile not found' });
                whereClause.staff_id = staffProfile.id;
            }
            else if (staffId) {
                whereClause.staff_id = String(staffId);
            }
        }
        if (from || to) {
            whereClause.start_datetime_utc = {};
            if (from)
                whereClause.start_datetime_utc.gte = new Date(String(from));
            if (to)
                whereClause.start_datetime_utc.lte = new Date(String(to));
        }
        const appointments = await index_1.prisma.appointment.findMany({
            where: whereClause,
            include: {
                staff: { include: { user: { select: { name: true } } } },
                service: { select: { name: true, duration_min: true, price: true } },
                business: { select: { name: true, slug: true } },
                client: { include: { user: { select: { name: true, email: true } } } }
            },
            orderBy: { start_datetime_utc: 'asc' }
        });
        return res.json(appointments);
    }
    catch (error) {
        console.error("Error fetching appointments: ", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAppointments = getAppointments;
const updateAppointmentStatus = async (req, res) => {
    try {
        const business_id = resolveBusinessId(req);
        const role = req.user?.role;
        const userId = req.user?.id;
        const { id } = req.params;
        const { status } = req.body; // 'CONFIRMED', 'COMPLETED', 'CANCELLED'
        if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const appointment = await index_1.prisma.appointment.findUnique({
            where: { id },
            include: { client: true }
        });
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (role === 'CLIENT') {
            if (appointment.client?.user_id !== userId) {
                return res.status(403).json({ error: 'Cannot modify other clients appointments' });
            }
            if (status !== 'CANCELLED') {
                return res.status(403).json({ error: 'Clients can only CANCEL appointments' });
            }
        }
        else {
            if (appointment.business_id !== business_id) {
                return res.status(403).json({ error: 'Not your business appointment' });
            }
            if (role === 'STAFF') {
                const staffProfile = await index_1.prisma.staffProfile.findFirst({
                    where: { user_id: userId }
                });
                if (appointment.staff_id !== staffProfile?.id) {
                    return res.status(403).json({ error: 'Cannot modify other staff appointments' });
                }
            }
        }
        const updated = await index_1.prisma.appointment.update({
            where: { id },
            data: { status }
        });
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateAppointmentStatus = updateAppointmentStatus;
