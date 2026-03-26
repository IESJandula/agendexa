"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const service_routes_1 = __importDefault(require("./routes/service.routes"));
const staff_routes_1 = __importDefault(require("./routes/staff.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const appointment_routes_1 = __importDefault(require("./routes/appointment.routes"));
const appointment_reminder_service_1 = require("./services/appointment-reminder.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
exports.prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_routes_1.default);
app.use('/admin', admin_routes_1.default);
app.use('/services', service_routes_1.default);
app.use('/staff', staff_routes_1.default);
app.use('/public', public_routes_1.default);
app.use('/appointments', appointment_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
async function initSuperAdmin() {
    try {
        const existingAdmin = await exports.prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
        if (!existingAdmin) {
            console.log('No SUPERADMIN found. Creating default...');
            const hashedPassword = await bcryptjs_1.default.hash('1234', 10);
            await exports.prisma.user.create({
                data: {
                    name: 'Super Admin',
                    email: 'admin@booksy-mvp.com',
                    password_hash: hashedPassword,
                    role: 'SUPERADMIN'
                }
            });
            console.log('Default SUPERADMIN created: admin@booksy-mvp.com / 1234');
        }
    }
    catch (error) {
        console.error('Failed to init superadmin:', error);
    }
}
app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    await initSuperAdmin();
    (0, appointment_reminder_service_1.startAppointmentReminderJob)(exports.prisma);
});
