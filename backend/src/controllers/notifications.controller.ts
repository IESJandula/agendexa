import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const notifications = await prisma.clientNotification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });

        return res.json(notifications);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const notification = await prisma.clientNotification.findUnique({ where: { id } });
        if (!notification || notification.user_id !== userId) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        const updated = await prisma.clientNotification.update({
            where: { id },
            data: { read_at: new Date() }
        });

        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
