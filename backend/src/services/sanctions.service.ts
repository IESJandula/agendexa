import { PrismaClient, Business, ClientProfile } from '@prisma/client';

export type SanctionAction = 'NONE' | 'WARNING' | 'CHARGE_NEXT' | 'BAN';

export type SanctionStep = {
    count: number;
    action: SanctionAction;
};

export type SanctionSettings = {
    cancel_cutoff_minutes: number;
    steps: SanctionStep[];
};

const DEFAULT_SANCTION_SETTINGS: SanctionSettings = {
    cancel_cutoff_minutes: 30,
    steps: [
        { count: 1, action: 'NONE' }
    ]
};

const VALID_ACTIONS = new Set<SanctionAction>(['NONE', 'WARNING', 'CHARGE_NEXT', 'BAN']);

export const normalizeSanctionSettings = (raw: any): SanctionSettings => {
    const incoming = raw && typeof raw === 'object' ? raw : {};
    const cancel_cutoff_minutes = Number.isFinite(incoming.cancel_cutoff_minutes)
        ? Math.max(0, Math.floor(incoming.cancel_cutoff_minutes))
        : DEFAULT_SANCTION_SETTINGS.cancel_cutoff_minutes;

    const steps: SanctionStep[] = Array.isArray(incoming.steps)
        ? incoming.steps
            .map((step: any) => ({
                count: Number(step?.count),
                action: String(step?.action || '').toUpperCase()
            }))
            .filter((step: any) => Number.isFinite(step.count) && VALID_ACTIONS.has(step.action))
            .map((step: any) => ({ count: Math.max(1, Math.floor(step.count)), action: step.action as SanctionAction }))
        : [];

    const normalizedSteps = (() => {
        const base = steps.length > 0
            ? steps.sort((a: SanctionStep, b: SanctionStep) => a.count - b.count)
            : DEFAULT_SANCTION_SETTINGS.steps;

        const deduped: SanctionStep[] = [];
        const usedCounts = new Set<number>();
        for (const step of base) {
            if (usedCounts.has(step.count)) continue;
            usedCounts.add(step.count);
            deduped.push(step);
            if (step.action === 'BAN') break;
        }

        return deduped.length > 0 ? deduped : DEFAULT_SANCTION_SETTINGS.steps;
    })();

    return {
        cancel_cutoff_minutes,
        steps: normalizedSteps
    };
};

export const getBusinessSanctionSettings = (business: Business): SanctionSettings => {
    const settings = (business.settings_json as any) || {};
    const raw = settings.sanctions || {};
    return normalizeSanctionSettings(raw);
};

export const upsertBusinessSanctionSettings = async (prisma: PrismaClient, businessId: string, input: any) => {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return null;

    const currentSettings = (business.settings_json as any) || {};
    const sanctions = normalizeSanctionSettings(input);

    const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
            settings_json: {
                ...currentSettings,
                sanctions
            }
        }
    });

    return getBusinessSanctionSettings(updated);
};

export const resolveSanctionAction = (settings: SanctionSettings, count: number): SanctionAction => {
    const sorted = settings.steps.slice().sort((a: SanctionStep, b: SanctionStep) => a.count - b.count);
    let action: SanctionAction = 'NONE';
    for (const step of sorted) {
        if (count >= step.count) action = step.action;
    }
    return action;
};

const buildNotificationMessage = (action: SanctionAction, businessName: string): { title: string; message: string } | null => {
    if (action === 'WARNING') {
        return {
            title: 'Amonestacion por inasistencia',
            message: `No asististe a tu cita en ${businessName}. Si vuelve a suceder podrias ser sancionado.`
        };
    }
    if (action === 'CHARGE_NEXT') {
        return {
            title: 'Sancion economica pendiente',
            message: `En tu proxima visita a ${businessName} deberas abonar el importe de la cita perdida.`
        };
    }
    if (action === 'BAN') {
        return {
            title: 'Acceso bloqueado',
            message: `Has sido bloqueado para reservar en ${businessName} por reiteradas inasistencias.`
        };
    }
    return null;
};

export const applyNoShowPenalty = async (prisma: PrismaClient, params: {
    businessId: string;
    businessName: string;
    clientProfile: ClientProfile;
    reason: 'NO_SHOW' | 'LATE_CANCEL';
}) => {
    const { businessId, businessName, clientProfile } = params;

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return null;

    const settings = getBusinessSanctionSettings(business);
    const nextCount = (clientProfile.no_show_count || 0) + 1;
    const action = resolveSanctionAction(settings, nextCount);

    const updatedClient = await prisma.clientProfile.update({
        where: { id: clientProfile.id },
        data: {
            no_show_count: nextCount,
            last_no_show_at: new Date(),
            last_sanction_action: action,
            last_sanction_at: new Date(),
            is_banned: action === 'BAN' ? true : clientProfile.is_banned
        }
    });

    const notification = buildNotificationMessage(action, businessName);
    if (notification) {
        await prisma.clientNotification.create({
            data: {
                user_id: clientProfile.user_id,
                business_id: businessId,
                type: action,
                title: notification.title,
                message: notification.message
            }
        });
    }

    return { updatedClient, action };
};
