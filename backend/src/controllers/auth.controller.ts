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
            where: { email: email.toLowerCase() },
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
                phone: user.phone,
                role: user.role,
                business_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const registerClient = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone).trim();

        if (normalizedPhone.length < 7) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        let user;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (existingUser) {
            // If the user exists but has no password (guest shadow account), upgrade it
            if (!existingUser.password_hash) {
                user = await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        name,
                        phone: normalizedPhone,
                        password_hash: hashedPassword,
                        role: 'CLIENT'
                    }
                });
            } else {
                return res.status(409).json({ error: 'Email already exists' });
            }
        } else {
            // Create brand new client user
            user = await prisma.user.create({
                data: {
                    name,
                    email: normalizedEmail,
                    phone: normalizedPhone,
                    password_hash: hashedPassword,
                    role: 'CLIENT'
                }
            });
        }

        // Auto login after registration
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_jwt_key_for_mvp', {
            expiresIn: '24h'
        });

        return res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
