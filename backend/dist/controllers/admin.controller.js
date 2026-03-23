"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinesses = exports.createBusiness = void 0;
const index_1 = require("../index");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createBusiness = async (req, res) => {
    try {
        const { ownerName, ownerEmail, ownerPassword, businessName, businessSlug, businessLocation, businessPhone, slotIntervalMinutes } = req.body;
        if (!ownerName || !ownerEmail || !ownerPassword || !businessName || !businessSlug || !businessLocation) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if user already exists
        const existingUser = await index_1.prisma.user.findUnique({ where: { email: ownerEmail } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        // Check if slug is taken
        const existingBusiness = await index_1.prisma.business.findUnique({ where: { slug: businessSlug } });
        if (existingBusiness) {
            return res.status(400).json({ error: 'Business slug already taken' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(ownerPassword, 10);
        const result = await index_1.prisma.$transaction(async (tx) => {
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
                    location: String(businessLocation).trim(),
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
    }
    catch (error) {
        console.error('Create business error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createBusiness = createBusiness;
const getBusinesses = async (req, res) => {
    try {
        const businesses = await index_1.prisma.business.findMany({
            include: {
                ownerProfiles: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            }
        });
        return res.json(businesses);
    }
    catch (error) {
        console.error('Get businesses error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getBusinesses = getBusinesses;
