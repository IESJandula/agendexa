import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                ownerProfiles: true,
                staffProfiles: true
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Determine business ID if applicable
        let business_id;
        if (user.role === 'OWNER' && user.ownerProfiles.length > 0) {
            business_id = user.ownerProfiles[0].business_id;
        } else if (user.role === 'STAFF' && user.staffProfiles.length > 0) {
            business_id = user.staffProfiles[0].business_id;
        }

        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            business_id
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_jwt_key_for_mvp', {
            expiresIn: '24h'
        });

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                business_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
