import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import serviceRoutes from './routes/service.routes';
import staffRoutes from './routes/staff.routes';
import publicRoutes from './routes/public.routes';
import appointmentRoutes from './routes/appointment.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/services', serviceRoutes);
app.use('/staff', staffRoutes);
app.use('/public', publicRoutes);
app.use('/appointments', appointmentRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

async function initSuperAdmin() {
    try {
        const existingAdmin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
        if (!existingAdmin) {
            console.log('No SUPERADMIN found. Creating default...');
            const hashedPassword = await bcrypt.hash('1234', 10);
            await prisma.user.create({
                data: {
                    name: 'Super Admin',
                    email: 'admin@booksy-mvp.com',
                    password_hash: hashedPassword,
                    role: 'SUPERADMIN'
                }
            });
            console.log('Default SUPERADMIN created: admin@booksy-mvp.com / 1234');
        }
    } catch (error) {
        console.error('Failed to init superadmin:', error);
    }
}

app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await initSuperAdmin();
});
