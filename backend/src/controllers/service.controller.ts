import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

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

export const getServices = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const services = await prisma.service.findMany({
            where: { business_id },
            include: {
                staff: { select: { staff_id: true } }
            }
        });
        return res.json(services);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const createService = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        if (!business_id) return res.status(403).json({ error: 'No business associated' });

        const { name, duration_min, price, is_active, staff_ids } = req.body;
        if (!name || duration_min === undefined || price === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newService = await prisma.$transaction(async (tx) => {
            const service = await tx.service.create({
                data: {
                    name,
                    duration_min,
                    price,
                    is_active: is_active ?? true,
                    business_id
                }
            });

            if (staff_ids && staff_ids.length > 0) {
                await tx.staffService.createMany({
                    data: staff_ids.map((staff_id: string) => ({
                        service_id: service.id,
                        staff_id
                    }))
                });
            }
            return service;
        });

        return res.status(201).json(newService);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateService = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        const { id } = req.params;
        const { name, duration_min, price, is_active, staff_ids } = req.body;

        const service = await prisma.service.findUnique({ where: { id } });
        if (!service || service.business_id !== business_id) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const updatedService = await tx.service.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(duration_min !== undefined && { duration_min }),
                    ...(price !== undefined && { price }),
                    ...(is_active !== undefined && { is_active })
                }
            });

            if (staff_ids !== undefined) {
                await tx.staffService.deleteMany({ where: { service_id: id } });
                await tx.staffService.createMany({
                    data: staff_ids.map((staff_id: string) => ({
                        service_id: id,
                        staff_id
                    }))
                });
            }
            return updatedService;
        });

        return res.json(updated);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteService = async (req: AuthRequest, res: Response) => {
    try {
        const business_id = resolveBusinessId(req);
        const { id } = req.params;

        const service = await prisma.service.findUnique({ where: { id } });
        if (!service || service.business_id !== business_id) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Instead of completely deleting, we could deactivate, but requirements say DELETE route
        await prisma.service.delete({ where: { id } });
        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
