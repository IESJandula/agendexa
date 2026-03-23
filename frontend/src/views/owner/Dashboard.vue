<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import CalendarPicker from '../../components/CalendarPicker.vue';

const router = useRouter();
const route = useRoute();
const activeTab = ref('appointments');
const services = ref<any[]>([]);
const staff = ref<any[]>([]);
const appointments = ref<any[]>([]);
const loading = ref(true);
const historyFilterType = ref<'days' | 'weeks'>('days');
const historyFilterValue = ref(7);
const businessSlug = ref('pelu');

const userRaw = localStorage.getItem('user');
let currentUser: any = null;
try {
  currentUser = userRaw ? JSON.parse(userRaw) : null;
} catch {
  currentUser = null;
}
const selectedBusinessId = typeof route.query.businessId === 'string' ? route.query.businessId : '';
const selectedBusinessSlug = typeof route.query.businessSlug === 'string' ? route.query.businessSlug : '';
const isSuperadminView = currentUser?.role === 'SUPERADMIN';

if (selectedBusinessSlug) {
  businessSlug.value = selectedBusinessSlug;
}

const showServiceModal = ref(false);
const editingServiceId = ref<string | null>(null);
const newService = ref({ name: '', description: '', duration_min: 30, price: 0, staff_ids: [] as string[] });

const showStaffModal = ref(false);
const editingStaffId = ref<string | null>(null);
const newStaff = ref({ name: '', email: '', password: '', service_ids: [] as string[] });

const showScheduleModal = ref(false);
const scheduleTargetStaffId = ref<string | null>(null);
const scheduleTargetStaffName = ref('');
const scheduleSaveMsg = ref('');

type DayScheduleForm = {
  day_of_week: number;
  name: string;
  active: boolean;
  start_time: string;
  end_time: string;
  split_active: boolean;
  split_start_time: string;
  split_end_time: string;
};

const defaultSchedule: DayScheduleForm[] = [
  { day_of_week: 1, name: 'Lunes', active: true, start_time: '09:00', end_time: '14:00', split_active: true, split_start_time: '16:00', split_end_time: '19:00' },
  { day_of_week: 2, name: 'Martes', active: true, start_time: '09:00', end_time: '14:00', split_active: true, split_start_time: '16:00', split_end_time: '19:00' },
  { day_of_week: 3, name: 'Miercoles', active: true, start_time: '09:00', end_time: '14:00', split_active: true, split_start_time: '16:00', split_end_time: '19:00' },
  { day_of_week: 4, name: 'Jueves', active: true, start_time: '09:00', end_time: '14:00', split_active: true, split_start_time: '16:00', split_end_time: '19:00' },
  { day_of_week: 5, name: 'Viernes', active: true, start_time: '09:00', end_time: '14:00', split_active: true, split_start_time: '16:00', split_end_time: '19:00' },
  { day_of_week: 6, name: 'Sabado', active: false, start_time: '10:00', end_time: '14:00', split_active: false, split_start_time: '16:00', split_end_time: '18:00' },
  { day_of_week: 0, name: 'Domingo', active: false, start_time: '10:00', end_time: '14:00', split_active: false, split_start_time: '16:00', split_end_time: '18:00' }
];

const cloneDefaultSchedule = () => JSON.parse(JSON.stringify(defaultSchedule));
const staffScheduleForm = ref<DayScheduleForm[]>(cloneDefaultSchedule());

// Booking stuff
const showBookingModal = ref(false);
const newBooking = ref({
  clientName: '',
  clientEmail: '',
  serviceId: '',
  staffId: '',
  date: '',
  time: ''
});
const availableSlots = ref<string[]>([]);
const monthlyAvailability = ref<Record<string, boolean>>({});

const todayIso = new Date().toISOString().split('T')[0] ?? '';
const agendaDate = ref<string>(todayIso);
const agendaAvailabilityMap = ref<Record<string, boolean>>({});

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map((part) => Number(part));
  return (h * 60) + m;
};

const hydrateScheduleForm = (schedules: any[]) => {
  const grouped = new Map<number, any[]>();
  for (const s of schedules || []) {
    if (!grouped.has(s.day_of_week)) grouped.set(s.day_of_week, []);
    grouped.get(s.day_of_week)?.push(s);
  }

  staffScheduleForm.value = cloneDefaultSchedule();
  for (const day of staffScheduleForm.value) {
    const ranges = (grouped.get(day.day_of_week) || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (!ranges.length) {
      day.active = false;
      day.split_active = false;
      continue;
    }

    day.active = true;
    day.start_time = ranges[0].start_time;
    day.end_time = ranges[0].end_time;

    if (ranges[1]) {
      day.split_active = true;
      day.split_start_time = ranges[1].start_time;
      day.split_end_time = ranges[1].end_time;
    } else {
      day.split_active = false;
    }
  }
};

const getAuthHeaders = (token: string) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  };
  if (selectedBusinessId) {
    headers['x-business-id'] = selectedBusinessId;
  }
  return headers;
};

const buildAgendaMonthAvailability = (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const map: Record<string, boolean> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    map[`${year}-${m}-${d}`] = true;
  }
  agendaAvailabilityMap.value = map;
};

const handleAgendaMonthChange = (year: number, month: number) => {
  buildAgendaMonthAvailability(year, month);
};

const handleAgendaDateSelect = (date: string) => {
  agendaDate.value = date;
};

const fetchDashboardData = async () => {
  const token = localStorage.getItem('token');
  if (!token) return router.push('/owner/login');
  if (isSuperadminView && !selectedBusinessId) return router.push('/superadmin/dashboard');
  
  loading.value = true;
  try {
    const headers = getAuthHeaders(token);
    
    const [appRes, srvRes, stfRes] = await Promise.all([
      fetch('http://localhost:3000/appointments', { headers }),
      fetch('http://localhost:3000/services', { headers }),
      fetch('http://localhost:3000/staff', { headers })
    ]);
    
    if (appRes.ok) {
      appointments.value = await appRes.json();
      if (appointments.value.length > 0 && appointments.value[0].business?.slug) {
        businessSlug.value = appointments.value[0].business.slug;
      }
    }
    if (srvRes.ok) services.value = await srvRes.json();
    if (stfRes.ok) staff.value = await stfRes.json();
    const current = new Date();
    buildAgendaMonthAvailability(current.getFullYear(), current.getMonth() + 1);
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const updateAppointmentStatus = async (id: string, status: string) => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    await fetch(`http://localhost:3000/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify({ status })
    });
    fetchDashboardData();
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  fetchDashboardData();
});

const historyAppointments = computed(() => {
  const now = new Date();
  const unitDays = historyFilterType.value === 'weeks' ? 7 : 1;
  const rangeDays = Math.max(1, Number(historyFilterValue.value)) * unitDays;
  const from = new Date(now.getTime() - (rangeDays * 24 * 60 * 60 * 1000));

  return appointments.value
    .filter((a) => {
      const date = new Date(a.start_datetime_utc);
      const isPast = date < now || a.status !== 'CONFIRMED';
      return isPast && date >= from && date <= now;
    })
    .sort((a, b) => new Date(b.start_datetime_utc).getTime() - new Date(a.start_datetime_utc).getTime());
});

const agendaAppointments = computed(() => {
  return appointments.value
    .filter((a) => a.start_datetime_utc?.startsWith(agendaDate.value))
    .sort((a, b) => new Date(a.start_datetime_utc).getTime() - new Date(b.start_datetime_utc).getTime());
});

const openAddServiceModal = () => {
  editingServiceId.value = null;
  newService.value = { name: '', description: '', duration_min: 30, price: 0, staff_ids: [] };
  showServiceModal.value = true;
};

const openEditServiceModal = (srv: any) => {
  editingServiceId.value = srv.id;
  newService.value = { 
    name: srv.name, 
    description: srv.description || '', 
    duration_min: srv.duration_min, 
    price: srv.price, 
    staff_ids: srv.staff ? srv.staff.map((s: any) => s.staff_id) : [] 
  };
  showServiceModal.value = true;
};

const handleSaveService = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const url = editingServiceId.value 
      ? `http://localhost:3000/services/${editingServiceId.value}` 
      : 'http://localhost:3000/services';
    const method = editingServiceId.value ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify(newService.value)
    });
    if (res.ok) {
      showServiceModal.value = false;
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) { console.error(err); }
};

const openAddStaffModal = () => {
  editingStaffId.value = null;
  newStaff.value = { name: '', email: '', password: '', service_ids: [] };
  showStaffModal.value = true;
};

const openEditStaffModal = (st: any) => {
  editingStaffId.value = st.id;
  newStaff.value = { 
    name: st.user.name, 
    email: st.user.email, 
    password: '', // blank on edit means don't change
    service_ids: st.services ? st.services.map((s: any) => s.service.id) : [] 
  };
  showStaffModal.value = true;
};

const handleSaveStaff = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const isEdit = !!editingStaffId.value;
    const url = isEdit 
      ? `http://localhost:3000/staff/${editingStaffId.value}` 
      : 'http://localhost:3000/staff';
    const method = isEdit ? 'PATCH' : 'POST';

    // Only send password if editing and it's filled, or if creating
    const payload: any = { ...newStaff.value };
    if (isEdit) {
      // Typically backend staff update might not support email/password change directly on this endpoint without user logic
      // Assuming basic active status and services for now based on current backend implementation
      // We will only send service_ids for update
      payload.service_ids = newStaff.value.service_ids;
      // We don't send name/email/password because backend updateStaff only accepts is_active and service_ids.
      // Modifying User data requires specific user updates. We will focus on Services relation.
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify(isEdit ? { service_ids: payload.service_ids } : payload)
    });
    if (res.ok) {
      showStaffModal.value = false;
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) { console.error(err); }
};

const openScheduleModal = (st: any) => {
  scheduleTargetStaffId.value = st.id;
  scheduleTargetStaffName.value = st.user.name;
  scheduleSaveMsg.value = '';
  hydrateScheduleForm(st.schedules || []);
  showScheduleModal.value = true;
};

const saveStaffSchedule = async () => {
  const token = localStorage.getItem('token');
  if (!token || !scheduleTargetStaffId.value) return;

  const payload: Array<{ day_of_week: number; start_time: string; end_time: string }> = [];

  for (const day of staffScheduleForm.value) {
    if (!day.active) continue;

    if (toMinutes(day.start_time) >= toMinutes(day.end_time)) {
      scheduleSaveMsg.value = `Horario invalido en ${day.name} (tramo 1).`;
      return;
    }

    payload.push({
      day_of_week: day.day_of_week,
      start_time: day.start_time,
      end_time: day.end_time
    });

    if (day.split_active) {
      if (toMinutes(day.split_start_time) >= toMinutes(day.split_end_time)) {
        scheduleSaveMsg.value = `Horario invalido en ${day.name} (tramo 2).`;
        return;
      }

      if (toMinutes(day.end_time) > toMinutes(day.split_start_time)) {
        scheduleSaveMsg.value = `Los tramos de ${day.name} se solapan.`;
        return;
      }

      payload.push({
        day_of_week: day.day_of_week,
        start_time: day.split_start_time,
        end_time: day.split_end_time
      });
    }
  }

  scheduleSaveMsg.value = 'Guardando...';

  try {
    const res = await fetch(`http://localhost:3000/staff/${scheduleTargetStaffId.value}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify({ schedules: payload })
    });

    if (!res.ok) {
      scheduleSaveMsg.value = 'No se pudo guardar el horario.';
      return;
    }

    scheduleSaveMsg.value = 'Horario actualizado correctamente.';
    await fetchDashboardData();
    setTimeout(() => {
      showScheduleModal.value = false;
      scheduleSaveMsg.value = '';
    }, 800);
  } catch (err) {
    console.error(err);
    scheduleSaveMsg.value = 'Error al guardar el horario.';
  }
};

const getScheduleSummary = (schedules: any[]) => {
  const totalRanges = (schedules || []).length;
  if (!totalRanges) return 'Sin horario configurado';
  return `${totalRanges} tramo(s) configurado(s)`;
};

const handleDateOrStaffChange = async () => {
  if (!newBooking.value.serviceId || !newBooking.value.staffId || !newBooking.value.date) {
    availableSlots.value = [];
    return;
  }
  
  try {
    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/availability?serviceId=${newBooking.value.serviceId}&staffId=${newBooking.value.staffId}&date=${newBooking.value.date}`);
    if (res.ok) {
      availableSlots.value = await res.json();
    } else {
      availableSlots.value = [];
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    availableSlots.value = [];
  }
};

const handleMonthChange = async (year: number, month: number) => {
  if (!newBooking.value.serviceId || !newBooking.value.staffId) return;
  try {
    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/availability/month?serviceId=${newBooking.value.serviceId}&staffId=${newBooking.value.staffId}&year=${year}&month=${month}`);
    if (res.ok) {
      monthlyAvailability.value = await res.json();
    } else {
      monthlyAvailability.value = {};
    }
  } catch (err) {
    console.error(err);
  }
};

const handleDateSelect = (dateStr: string) => {
  newBooking.value.date = dateStr;
  handleDateOrStaffChange(); // Load the timeslots for that date
};

const fetchInitialMonthlyAvailability = () => {
  const today = new Date();
  handleMonthChange(today.getFullYear(), today.getMonth() + 1);
};

// Also inject fetchInitialMonthlyAvailability into handleDateOrStaffChange if date doesn't exist yet but service and staff do
const handleServiceStaffChange = () => {
  if (newBooking.value.serviceId && newBooking.value.staffId) {
    fetchInitialMonthlyAvailability();
    if (newBooking.value.date) {
      handleDateOrStaffChange();
    }
  }
};

const openBookingModal = () => {
  newBooking.value = { clientName: '', clientEmail: '', serviceId: '', staffId: '', date: '', time: '' };
  availableSlots.value = [];
  monthlyAvailability.value = {};
  showBookingModal.value = true;
};

const handleSaveBooking = async () => {
  try {
    const payload = {
      clientName: newBooking.value.clientName,
      clientEmail: newBooking.value.clientEmail,
      serviceId: newBooking.value.serviceId,
      staffId: newBooking.value.staffId,
      startDatetimeUtc: newBooking.value.time
    };

    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showBookingModal.value = false;
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    console.error(err);
  }
};

const logout = () => {
  localStorage.removeItem('token');
  router.push('/');
};

const translateStatus = (status: string) => {
  if (status === 'CONFIRMED') return 'Confirmada';
  if (status === 'COMPLETED') return 'Completada';
  if (status === 'CANCELLED') return 'Cancelada';
  return status;
};

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
const formatLongDate = (isoString: string) => new Date(isoString).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatPrice = (value: number | string) => {
  const numeric = Number(value);
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(numeric);
};
</script>

<template>
  <div class="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-10 pt-6 md:pt-8 flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-16 min-h-screen relative overflow-hidden">
    
    <!-- Ultra luxe background elements -->
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <!-- Sidebar / Nav -->
    <aside class="w-full md:w-72 shrink-0 flex flex-col relative z-10 animate-fade-in-up">
      <div class="mb-12">
        <h2 class="font-display font-medium text-3xl tracking-wide uppercase text-white">Agendexa Hub</h2>
        <div class="h-[1px] w-12 bg-primary mt-4"></div>
      </div>

      <nav class="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        <button 
          @click="activeTab = 'appointments'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'appointments' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Agenda
        </button>
        <button 
          @click="activeTab = 'history'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'history' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Historial
        </button>
        <button 
          @click="activeTab = 'services'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'services' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Catálogo de servicios
        </button>
        <button 
          @click="activeTab = 'staff'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'staff' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Personal
        </button>
      </nav>

      <div class="mt-auto pt-16">
        <button @click="logout" class="w-full px-6 py-4 border border-border hover:border-primary/40 text-xs font-semibold tracking-widest uppercase text-textMuted hover:text-brandDark transition-all rounded-md bg-surface">
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 relative z-10">
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-50">
        <div class="w-16 h-16 border border-primary/20 flex items-center justify-center mb-4">
          <div class="w-8 h-8 border border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full"></div>
        </div>
        <p class="text-primary font-light tracking-[0.3em] text-xs uppercase animate-pulse">Sincronizando</p>
      </div>

      <div v-if="isSuperadminView" class="mb-6 p-4 border border-primary/20 bg-primary/5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p class="text-xs uppercase tracking-widest text-textMuted">
          Modo superadmin activo // negocio {{ businessSlug }}
        </p>
        <button type="button" @click="router.push('/superadmin/dashboard')" class="btn-secondary px-4 py-2 text-[10px]">
          Volver al panel superadmin
        </button>
      </div>

      <!-- Agenda View -->
      <div v-show="activeTab === 'appointments'" class="animate-fade-in-up delay-100 h-full flex flex-col">
        <header class="flex justify-between items-end border-b border-border pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Agenda por dia</h3>
            <p class="text-textMuted text-xs uppercase tracking-widest mt-2 font-light">Selecciona una fecha para ver sus horarios</p>
          </div>
          <button @click="openBookingModal" class="btn-primary px-6 py-2 tracking-widest text-[10px] uppercase">+ Nueva reserva</button>
        </header>

        <div class="grid grid-cols-1 xl:grid-cols-[350px_1fr] gap-6">
          <section class="bg-surface border border-border rounded-xl p-4">
            <CalendarPicker
              :availabilityMap="agendaAvailabilityMap"
              :selectedDate="agendaDate"
              @month-change="handleAgendaMonthChange"
              @select="handleAgendaDateSelect"
            />
          </section>

          <section class="bg-surface border border-border rounded-xl p-6">
            <div class="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h4 class="font-display text-xl text-white">Citas del {{ formatLongDate(agendaDate) }}</h4>
              <span class="text-xs uppercase tracking-widest text-textMuted">{{ agendaAppointments.length }} cita(s)</span>
            </div>

            <div v-if="agendaAppointments.length === 0" class="py-20 text-center">
              <p class="text-textMuted uppercase tracking-widest text-sm font-light">No hay citas para este dia.</p>
            </div>

            <div v-else class="space-y-3">
              <article v-for="app in agendaAppointments" :key="app.id" class="p-4 border border-border rounded-lg bg-surfaceHover/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start gap-4">
                  <div class="shrink-0 min-w-[78px] text-center border border-primary/20 bg-primary/5 rounded-md py-2 px-2">
                    <p class="text-sm font-semibold text-primary">{{ formatTime(app.start_datetime_utc) }}</p>
                    <p class="text-[10px] uppercase tracking-widest text-textMuted">{{ formatTime(app.end_datetime_utc) }}</p>
                  </div>
                  <div>
                    <h5 class="font-semibold text-text">{{ app.service.name }}</h5>
                    <p class="text-xs text-textMuted uppercase tracking-widest mt-1">Profesional: {{ app.staff.user.name }}</p>
                    <p class="text-xs text-textMuted mt-2">Cliente: {{ app.client?.user?.name || 'Sin nombre' }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span :class="['text-xs uppercase tracking-[0.2em] font-medium border-b pb-1', app.status === 'CONFIRMED' ? 'text-primary border-primary/30' : app.status === 'COMPLETED' ? 'text-neutral-500 border-neutral-700' : 'text-red-500/70 border-red-900/50']">
                    {{ translateStatus(app.status) }}
                  </span>
                  <button v-if="app.status === 'CONFIRMED'" @click="updateAppointmentStatus(app.id, 'COMPLETED')" class="w-9 h-9 border border-border hover:border-primary text-textMuted hover:text-primary flex items-center justify-center transition-all bg-surface rounded-md" title="Marcar como completada">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button v-if="app.status === 'CONFIRMED'" @click="updateAppointmentStatus(app.id, 'CANCELLED')" class="w-9 h-9 border border-border hover:border-red-400 text-textMuted hover:text-red-600 flex items-center justify-center transition-all bg-surface rounded-md" title="Cancelar">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <!-- History View -->
      <div v-show="activeTab === 'history'" class="animate-fade-in-up delay-100 h-full flex flex-col">
        <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6 mb-8 gap-4">
          <div>
            <h3 class="font-display text-2xl text-white">Historial de citas</h3>
            <p class="text-textMuted text-xs uppercase tracking-widest mt-2 font-light">Filtrar por dias o semanas</p>
          </div>
          <div class="flex items-center gap-3">
            <select v-model="historyFilterType" class="input-premium py-2 px-3 text-xs w-auto">
              <option value="days">Ultimos dias</option>
              <option value="weeks">Ultimas semanas</option>
            </select>
            <input v-model.number="historyFilterValue" type="number" min="1" class="input-premium py-2 px-3 text-xs w-24" />
          </div>
        </header>

        <div v-if="historyAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 border border-border bg-surface rounded-xl">
          <p class="text-textMuted font-light text-sm">No hay citas para el rango seleccionado.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in historyAppointments" :key="app.id" class="p-6 bg-surface border border-border rounded-xl flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <p class="text-[10px] text-textMuted uppercase tracking-[0.2em] mb-1">{{ app.business?.name }}</p>
              <h4 class="font-display text-lg text-text mb-1">{{ app.service.name }}</h4>
              <p class="text-xs text-textMuted">{{ formatDate(app.start_datetime_utc) }} - {{ formatTime(app.start_datetime_utc) }}</p>
              <p class="text-xs text-textMuted mt-2">Profesional: {{ app.staff.user.name }}</p>
            </div>
            <div class="flex items-start">
              <span class="text-[10px] px-3 py-1 uppercase tracking-widest border bg-surfaceHover text-textMuted border-border">
                {{ translateStatus(app.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Services View -->
      <div v-show="activeTab === 'services'" class="animate-fade-in-up delay-100">
        <header class="flex justify-between items-end border-b border-border pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Portafolio de servicios</h3>
          </div>
          <button v-if="services.length > 0" @click="openAddServiceModal" class="text-primary text-xs tracking-widest uppercase border-b border-primary/30 pb-1 hover:text-brandDark transition-colors">+ Añadir servicio</button>
        </header>
        <div v-if="services.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 border border-border bg-surface text-center animate-fade-in-up rounded-xl">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 4v16m8-8H4" /></svg>
          </div>
          <h4 class="font-display text-xl text-white mb-2">Primer paso al éxito</h4>
          <p class="text-textMuted font-light text-sm max-w-md mb-8 leading-relaxed">Muestra a tus clientes lo que ofreces. Añade tu primer servicio en Agendexa para comenzar a llenar tu agenda.</p>
          <button @click="openAddServiceModal" class="btn-primary text-xs tracking-widest px-8">Crear primer servicio</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="srv in services" :key="srv.id" @click="openEditServiceModal(srv)" class="cursor-pointer p-6 bg-surface border border-border relative overflow-hidden group hover:border-primary/30 transition-colors rounded-xl">
            <h4 class="font-display text-xl text-white mb-4">{{ srv.name }}</h4>
            <div class="flex items-center gap-6">
              <span class="text-xs uppercase tracking-widest text-textMuted font-light">{{ srv.duration_min }} MIN</span>
              <span class="text-lg font-light text-primary">{{ formatPrice(srv.price) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Staff View -->
      <div v-show="activeTab === 'staff'" class="animate-fade-in-up delay-100">
        <header class="flex justify-between items-end border-b border-border pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Personal</h3>
          </div>
          <button v-if="staff.length > 0" @click="openAddStaffModal" class="text-primary text-xs tracking-widest uppercase border-b border-primary/30 pb-1 hover:text-brandDark transition-colors">+ Añadir profesional</button>
        </header>
        <div v-if="staff.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 border border-border bg-surface text-center animate-fade-in-up rounded-xl">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h4 class="font-display text-xl text-white mb-2">Crea tu equipo</h4>
          <p class="text-textMuted font-light text-sm max-w-md mb-8 leading-relaxed">Agendexa necesita profesionales para prestar servicios. Añade tu primer miembro y define su disponibilidad.</p>
          <button @click="openAddStaffModal" class="btn-primary text-xs tracking-widest px-8">Añadir miembro</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="st in staff" :key="st.id" class="p-6 bg-surface border border-border group hover:border-primary/30 transition-colors rounded-xl">
            <div class="flex items-center gap-6">
              <div class="w-14 h-14 bg-gradient-to-tr from-surfaceHover to-border border border-border flex items-center justify-center font-display text-xl text-brandDark rounded-lg">
                {{ st.user.name.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="font-display text-lg text-white mb-1">{{ st.user.name }}</h4>
                <p class="text-xs text-textMuted uppercase tracking-widest mb-2 font-light truncate" :title="st.user.email">{{ st.user.email }}</p>
                <span :class="['text-[10px] px-2 py-1 uppercase tracking-widest rounded', st.is_active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surfaceHover text-textMuted border border-border']">
                  {{ st.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            <p class="text-xs text-textMuted mt-4">{{ getScheduleSummary(st.schedules) }}</p>
            <div class="mt-4 flex gap-3">
              <button type="button" @click="openEditStaffModal(st)" class="btn-secondary px-4 py-2 tracking-widest text-[10px]">Editar</button>
              <button type="button" @click="openScheduleModal(st)" class="btn-primary px-4 py-2 tracking-widest text-[10px]">Horario</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Service Modal -->
      <div v-if="showServiceModal" class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:px-8 md:pt-24 md:pb-12 overflow-y-auto">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showServiceModal = false"></div>
        <div class="w-full max-w-lg my-2 sm:my-3 max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] custom-scrollbar bg-surface border border-border px-6 py-8 sm:px-10 sm:py-10 relative z-10 shadow-xl animate-fade-in-up rounded-xl flex flex-col">
          <h2 class="font-display text-3xl text-white mb-2">{{ editingServiceId ? 'Editar servicio' : 'Nuevo servicio' }}</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-border pb-6">Amplía tu catálogo de servicios</p>
          <form @submit.prevent="handleSaveService" class="flex flex-col min-h-0 flex-1">
            <div class="space-y-6 overflow-y-auto pr-1 pb-4">
              <input v-model="newService.name" type="text" placeholder="NOMBRE DEL SERVICIO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-model="newService.description" type="text" placeholder="DESCRIPCIÓN (OPCIONAL)" class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <div class="grid grid-cols-2 gap-4">
                <input v-model.number="newService.duration_min" type="number" placeholder="DURACIÓN (MIN)" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
                <input v-model.number="newService.price" type="number" placeholder="PRECIO (EUR)" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              </div>

              <!-- Assigned Staff Checkboxes -->
              <div class="pt-4 border-t border-border">
                <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Profesionales asignados</label>
                <div v-if="staff.length === 0" class="text-textMuted text-xs font-light">
                  Todavía no hay profesionales disponibles.
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <label v-for="st in staff" :key="st.id" class="flex items-center gap-3 p-3 bg-surface border border-border hover:border-primary/30 cursor-pointer transition-colors group rounded-md">
                    <input type="checkbox" v-model="newService.staff_ids" :value="st.id" class="accent-primary w-4 h-4" />
                    <div class="flex flex-col min-w-0 flex-1">
                      <span class="text-xs text-text group-hover:text-primary transition-colors">{{ st.user.name }}</span>
                      <span class="text-[10px] text-textMuted uppercase tracking-widest truncate" :title="st.user.email">{{ st.user.email }}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex flex-wrap justify-end gap-3 mt-6 pt-6 border-t border-border bg-surface">
              <button type="button" @click="showServiceModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]">{{ editingServiceId ? 'Guardar cambios' : 'Crear servicio' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create/Edit Staff Modal -->
      <div v-if="showStaffModal" class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:px-8 md:pt-24 md:pb-12 overflow-y-auto">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showStaffModal = false"></div>
        <div class="w-full max-w-lg my-2 sm:my-3 max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] custom-scrollbar bg-surface border border-border px-6 py-8 sm:px-10 sm:py-10 relative z-10 shadow-xl animate-fade-in-up rounded-xl flex flex-col">
          <h2 class="font-display text-3xl text-white mb-2">{{ editingStaffId ? 'Editar profesional' : 'Nuevo profesional' }}</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-border pb-6">Gestiona tu equipo</p>
          <form @submit.prevent="handleSaveStaff" class="flex flex-col min-h-0 flex-1">
            <div class="space-y-6 overflow-y-auto pr-1 pb-4">
              <input v-if="!editingStaffId" v-model="newStaff.name" type="text" placeholder="NOMBRE COMPLETO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-if="!editingStaffId" v-model="newStaff.email" type="email" placeholder="CORREO DE ACCESO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-if="!editingStaffId" v-model="newStaff.password" type="password" placeholder="CONTRASEÑA INICIAL" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              
              <div class="pt-4 border-t border-border">
                <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Servicios asignados</label>
                <div v-if="services.length === 0" class="text-textMuted text-xs font-light">
                  No hay servicios disponibles todavía. Crea primero un servicio en el catálogo.
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <label v-for="srv in services" :key="srv.id" class="flex items-center gap-3 p-3 bg-surface border border-border hover:border-primary/30 cursor-pointer transition-colors group rounded-md">
                    <input type="checkbox" v-model="newStaff.service_ids" :value="srv.id" class="accent-primary w-4 h-4" />
                    <div class="flex flex-col">
                      <span class="text-xs text-text group-hover:text-primary transition-colors">{{ srv.name }}</span>
                      <span class="text-[10px] text-textMuted uppercase tracking-widest">{{ srv.duration_min }} MIN</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex flex-wrap justify-end gap-3 mt-6 pt-6 border-t border-border bg-surface">
              <button type="button" @click="showStaffModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]">{{ editingStaffId ? 'Guardar cambios' : 'Registrar profesional' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Staff Schedule Modal -->
      <div v-if="showScheduleModal" class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:px-8 md:pt-24 md:pb-12 overflow-y-auto">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showScheduleModal = false"></div>
        <div class="w-full max-w-4xl my-2 sm:my-3 max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] custom-scrollbar bg-surface border border-border px-6 py-8 sm:px-10 sm:py-10 relative z-10 shadow-xl animate-fade-in-up rounded-xl flex flex-col">
          <h2 class="font-display text-3xl text-white mb-2">Horario de {{ scheduleTargetStaffName }}</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-6 border-b border-border pb-4">Turno continuo o partido</p>

          <div class="space-y-4 overflow-y-auto pr-1 pb-4">
            <div v-for="day in staffScheduleForm" :key="day.day_of_week" class="p-4 rounded-lg bg-surface border border-border">
              <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div class="flex items-center gap-3">
                  <input type="checkbox" v-model="day.active" class="w-4 h-4 rounded border-border bg-transparent text-primary focus:ring-primary transition-colors" />
                  <span class="text-sm font-medium" :class="day.active ? 'text-text' : 'text-textMuted'">{{ day.name }}</span>
                </div>
                <label class="flex items-center gap-2 text-xs text-textMuted" :class="{ 'opacity-50 pointer-events-none': !day.active }">
                  <input type="checkbox" v-model="day.split_active" class="w-4 h-4 rounded border-border bg-transparent text-primary focus:ring-primary" />
                  Turno partido
                </label>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4" :class="{ 'opacity-50 pointer-events-none': !day.active }">
                <div class="p-3 border border-border rounded-md bg-surfaceHover/40">
                  <p class="text-[11px] uppercase tracking-widest text-textMuted mb-2">Tramo 1</p>
                  <div class="flex items-center gap-2">
                    <input type="time" v-model="day.start_time" class="input-premium py-2 px-3 text-xs" />
                    <span class="text-textMuted text-xs">a</span>
                    <input type="time" v-model="day.end_time" class="input-premium py-2 px-3 text-xs" />
                  </div>
                </div>

                <div class="p-3 border border-border rounded-md bg-surfaceHover/40" :class="{ 'opacity-50 pointer-events-none': !day.split_active }">
                  <p class="text-[11px] uppercase tracking-widest text-textMuted mb-2">Tramo 2</p>
                  <div class="flex items-center gap-2">
                    <input type="time" v-model="day.split_start_time" class="input-premium py-2 px-3 text-xs" />
                    <span class="text-textMuted text-xs">a</span>
                    <input type="time" v-model="day.split_end_time" class="input-premium py-2 px-3 text-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-surface">
            <p class="text-xs" :class="scheduleSaveMsg.includes('invalido') || scheduleSaveMsg.includes('solapan') || scheduleSaveMsg.includes('No se pudo') || scheduleSaveMsg.includes('Error') ? 'text-red-700' : 'text-primary'">
              {{ scheduleSaveMsg }}
            </p>
            <div class="flex flex-wrap gap-3 sm:justify-end">
              <button type="button" @click="showScheduleModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
              <button type="button" @click="saveStaffSchedule" class="btn-primary px-8 py-3 tracking-widest text-[10px]">Guardar horario</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Booking Modal (Internal) -->
      <div v-if="showBookingModal" class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:px-8 md:pt-24 md:pb-12 overflow-y-auto">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showBookingModal = false"></div>
        <div class="w-full max-w-lg my-2 sm:my-3 max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] custom-scrollbar bg-surface border border-border px-6 py-8 sm:px-10 sm:py-10 relative z-10 shadow-xl animate-fade-in-up rounded-xl flex flex-col">
          <h2 class="font-display text-3xl text-white mb-2">Reserva interna</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-border pb-6">Asigna manualmente un cliente en la agenda</p>
          
          <form @submit.prevent="handleSaveBooking" class="flex flex-col min-h-0 flex-1">
            <div class="space-y-6 overflow-y-auto pr-1 pb-4">
              <input v-model="newBooking.clientName" type="text" placeholder="NOMBRE DEL CLIENTE" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-model="newBooking.clientEmail" type="email" placeholder="CORREO DEL CLIENTE" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              
              <div class="grid grid-cols-2 gap-4">
                <select v-model="newBooking.serviceId" @change="handleServiceStaffChange" required class="input-premium text-xs tracking-widest text-text">
                  <option value="" disabled selected>SERVICIO</option>
                  <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
                <select v-model="newBooking.staffId" @change="handleServiceStaffChange" required class="input-premium text-xs tracking-widest text-text">
                  <option value="" disabled selected>PROFESIONAL</option>
                  <option v-for="st in staff" :key="st.id" :value="st.id">{{ st.user.name }}</option>
                </select>
              </div>

              <div v-if="newBooking.serviceId && newBooking.staffId" class="animate-fade-in-up">
                 <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Selecciona fecha</label>
                 <CalendarPicker 
                    :availabilityMap="monthlyAvailability"
                    :selectedDate="newBooking.date"
                    @month-change="handleMonthChange"
                    @select="handleDateSelect"
                 />
              </div>

              <div class="grid grid-cols-1 gap-4 animate-fade-in-up" v-if="newBooking.date">
                <label class="block text-primary uppercase tracking-widest text-[10px] mb-1 font-semibold">
                  Horarios disponibles para {{ formatDate(newBooking.date) }}
                </label>
                
                <div v-if="availableSlots.length === 0" class="flex flex-col items-center justify-center text-textMuted py-4">
                  <div class="w-12 h-[1px] bg-primary/30 mb-6"></div>
                  <p class="font-light tracking-widest text-[10px] uppercase">Sin disponibilidad</p>
                </div>

                <div v-else class="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <button 
                    v-for="slot in availableSlots" 
                    :key="slot" 
                    type="button"
                    @click="newBooking.time = slot" 
                    :class="['py-3 text-center border transition-all duration-300 text-sm font-light tracking-widest',
                      newBooking.time === slot 
                          ? 'bg-primary text-black border-primary shadow-[0_0_12px_rgba(57,203,105,0.35)] font-medium'
                          : 'border-border bg-surface text-text hover:bg-primary/10 hover:border-primary/50'
                    ]">
                    {{ formatTime(slot) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex flex-wrap justify-end gap-3 mt-6 pt-6 border-t border-border bg-surface">
              <button type="button" @click="showBookingModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]" :disabled="!newBooking.time">Bloquear horario</button>
            </div>
          </form>
        </div>
      </div>

    </main>

  </div>
</template>

