import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

export const createBusiness = async (req: Request, res: Response) => {
    try {
        const { ownerName, ownerEmail, ownerPassword, businessName, businessSlug, businessPhone, slotIntervalMinutes } = req.body;

        if (!ownerName || !ownerEmail || !ownerPassword || !businessName || !businessSlug) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check if slug is taken
        const existingBusiness = await prisma.business.findUnique({ where: { slug: businessSlug } });
        if (existingBusiness) {
            return res.status(400).json({ error: 'Business slug already taken' });
        }

        const hashedPassword = await bcrypt.hash(ownerPassword, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the Owner User
            const owner = await tx.user.create({
                data: {
                    name: ownerName,
                    email: ownerEmail,
                    password_hash: hashedPassword,
                    role: 'OWNER'
                }
            });

            // 2. Create the Business
            const business = await tx.business.create({
                data: {
                    name: businessName,
                    slug: businessSlug,
                    phone: businessPhone,
                    slot_interval_minutes: slotIntervalMinutes || 30
                }
            });

            // 3. Create the OwnerProfile linking User and Business
            await tx.ownerProfile.create({
                data: {
                    user_id: owner.id,
                    business_id: business.id
                }
            });

            return { owner, business };
        });

        return res.status(201).json({
            message: 'Business and Owner created successfully',
            owner: { id: result.owner.id, name: result.owner.name, email: result.owner.email },
            business: result.business
        });
    } catch (error) {
        console.error('Create business error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const getBusinesses = async (req: Request, res: Response) => {
    try {
        const businesses = await prisma.business.findMany({
            include: {
                ownerProfiles: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });
        return res.json(businesses);
    } catch (error) {
        console.error('Get businesses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
