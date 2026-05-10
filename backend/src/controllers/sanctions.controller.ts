import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getBusinessSanctionSettings, resolveSanctionAction, upsertBusinessSanctionSettings } from '../services/sanctions.service';

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

export const getSanctionSettings = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const business = await prisma.business.findUnique({ where: { id: business_id } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        return res.json(getBusinessSanctionSettings(business));
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSanctionSettings = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const updated = await upsertBusinessSanctionSettings(prisma, business_id, req.body || {});
        if (!updated) return res.status(404).json({ error: 'Business not found' });

        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSanctionClients = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const business = await prisma.business.findUnique({ where: { id: business_id } });
        if (!business) return res.status(404).json({ error: 'Business not found' });

        const settings = getBusinessSanctionSettings(business);

        const clients = await prisma.clientProfile.findMany({
            where: {
                business_id,
                OR: [
                    { no_show_count: { gt: 0 } },
                    { is_banned: true }
                ]
            },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } }
            },
            orderBy: { no_show_count: 'desc' }
        });

        const payload = clients.map((client) => {
            const nextAction = resolveSanctionAction(settings, client.no_show_count || 0);
            return {
                id: client.id,
                user: client.user,
                no_show_count: client.no_show_count,
                last_no_show_at: client.last_no_show_at,
                last_sanction_action: client.last_sanction_action,
                last_sanction_at: client.last_sanction_at,
                is_banned: client.is_banned,
                next_action: nextAction
            };
        });

        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
