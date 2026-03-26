<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import CalendarPicker from '../../components/CalendarPicker.vue';

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

const router = useRouter();
const token = localStorage.getItem('token') || '';

const staffProfile = ref<any>(null);
const services = ref<any[]>([]);
const appointments = ref<any[]>([]);
const activeTab = ref('appointments');
const saveMsg = ref('');
const businessSlug = ref('');

const showBookingModal = ref(false);
const newBooking = ref({
  clientName: '',
  clientEmail: '',
  serviceId: '',
  date: '',
  time: ''
});
const availableSlots = ref<string[]>([]);
const monthlyAvailability = ref<Record<string, boolean>>({});

const todayIso = new Date().toISOString().split('T')[0] ?? '';
const agendaDate = ref<string>(todayIso);
const agendaAvailabilityMap = ref<Record<string, boolean>>({});

const historyFilterType = ref<'days' | 'weeks'>('days');
const historyFilterValue = ref(7);

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
const scheduleForm = ref<DayScheduleForm[]>(cloneDefaultSchedule());

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

  scheduleForm.value = cloneDefaultSchedule();

  for (const day of scheduleForm.value) {
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

const fetchProfile = async () => {
  const res = await fetch('http://localhost:3000/staff/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/staff/login');
    return;
  }

  staffProfile.value = await res.json();
  services.value = (staffProfile.value?.services || []).map((entry: any) => entry.service).filter(Boolean);
  businessSlug.value = staffProfile.value?.business?.slug || '';
  hydrateScheduleForm(staffProfile.value?.schedules || []);

  const current = new Date();
  buildAgendaMonthAvailability(current.getFullYear(), current.getMonth() + 1);
};

const fetchAppointments = async () => {
  const res = await fetch('http://localhost:3000/appointments', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    appointments.value = await res.json();
  }
};

onMounted(async () => {
  if (!token) {
    router.push('/staff/login');
    return;
  }

  try {
    await Promise.all([fetchProfile(), fetchAppointments()]);
  } catch (error) {
    console.error(error);
  }
});

const agendaAppointments = computed(() => {
  return appointments.value
    .filter((a) => a.start_datetime_utc?.startsWith(agendaDate.value))
    .sort((a, b) => new Date(a.start_datetime_utc).getTime() - new Date(b.start_datetime_utc).getTime());
});

const pastAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter((a) => new Date(a.start_datetime_utc) < now || ['COMPLETED', 'CANCELLED'].includes(a.status))
    .sort((a, b) => new Date(b.start_datetime_utc).getTime() - new Date(a.start_datetime_utc).getTime());
});

const filteredPastAppointments = computed(() => {
  const now = new Date();
  const multiplier = historyFilterType.value === 'weeks' ? 7 : 1;
  const days = Math.max(1, Number(historyFilterValue.value)) * multiplier;
  const from = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

  return pastAppointments.value.filter((a) => {
    const date = new Date(a.start_datetime_utc);
    return date >= from && date <= now;
  });
});

const saveSchedule = async () => {
  if (!staffProfile.value?.id) return;

  const payload: Array<{ day_of_week: number; start_time: string; end_time: string }> = [];

  for (const day of scheduleForm.value) {
    if (!day.active) continue;

    if (toMinutes(day.start_time) >= toMinutes(day.end_time)) {
      saveMsg.value = `Horario invalido en ${day.name} (tramo 1).`;
      return;
    }

    payload.push({
      day_of_week: day.day_of_week,
      start_time: day.start_time,
      end_time: day.end_time
    });

    if (day.split_active) {
      if (toMinutes(day.split_start_time) >= toMinutes(day.split_end_time)) {
        saveMsg.value = `Horario invalido en ${day.name} (tramo 2).`;
        return;
      }

      if (toMinutes(day.end_time) > toMinutes(day.split_start_time)) {
        saveMsg.value = `Los tramos de ${day.name} se solapan.`;
        return;
      }

      payload.push({
        day_of_week: day.day_of_week,
        start_time: day.split_start_time,
        end_time: day.split_end_time
      });
    }
  }

  saveMsg.value = 'Guardando...';

  try {
    const res = await fetch(`http://localhost:3000/staff/${staffProfile.value.id}/schedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ schedules: payload })
    });

    if (!res.ok) {
      saveMsg.value = 'No se pudo guardar el horario.';
      return;
    }

    saveMsg.value = 'Horario actualizado correctamente.';
    await Promise.all([fetchProfile(), fetchAppointments()]);
    setTimeout(() => {
      saveMsg.value = '';
    }, 2500);
  } catch (error) {
    console.error(error);
    saveMsg.value = 'Error al guardar el horario.';
  }
};

const updateAppointmentStatus = async (id: string, status: string) => {
  try {
    await fetch(`http://localhost:3000/appointments/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    fetchAppointments();
  } catch (error) {
    console.error(error);
  }
};

const handleMonthChange = async (year: number, month: number) => {
  if (!newBooking.value.serviceId || !staffProfile.value?.id || !businessSlug.value) return;
  try {
    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/availability/month?serviceId=${newBooking.value.serviceId}&staffId=${staffProfile.value.id}&year=${year}&month=${month}`);
    if (res.ok) {
      monthlyAvailability.value = await res.json();
    } else {
      monthlyAvailability.value = {};
    }
  } catch (err) {
    console.error(err);
  }
};

const handleDateChange = async () => {
  if (!newBooking.value.serviceId || !newBooking.value.date || !staffProfile.value?.id || !businessSlug.value) {
    availableSlots.value = [];
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/availability?serviceId=${newBooking.value.serviceId}&staffId=${staffProfile.value.id}&date=${newBooking.value.date}`);
    if (res.ok) {
      availableSlots.value = await res.json();
    } else {
      availableSlots.value = [];
    }
  } catch (error) {
    console.error(error);
    availableSlots.value = [];
  }
};

const handleDateSelect = (dateStr: string) => {
  newBooking.value.date = dateStr;
  handleDateChange();
};

const handleServiceChange = () => {
  availableSlots.value = [];
  newBooking.value.date = '';
  newBooking.value.time = '';
  monthlyAvailability.value = {};

  if (!newBooking.value.serviceId) return;
  const today = new Date();
  handleMonthChange(today.getFullYear(), today.getMonth() + 1);
};

const openBookingModal = () => {
  newBooking.value = { clientName: '', clientEmail: '', serviceId: '', date: '', time: '' };
  availableSlots.value = [];
  monthlyAvailability.value = {};
  showBookingModal.value = true;
};

const handleSaveBooking = async () => {
  if (!staffProfile.value?.id || !businessSlug.value) {
    alert('No se ha podido resolver el negocio para reservar.');
    return;
  }

  try {
    const payload = {
      clientName: newBooking.value.clientName,
      clientEmail: newBooking.value.clientEmail,
      serviceId: newBooking.value.serviceId,
      staffId: staffProfile.value.id,
      startDatetimeUtc: newBooking.value.time
    };

    const res = await fetch(`http://localhost:3000/public/${businessSlug.value}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showBookingModal.value = false;
      await fetchAppointments();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    console.error(err);
  }
};

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/staff/login');
};

const translateStatus = (status: string) => {
  if (status === 'PENDING_CONFIRMATION') return 'Pendiente de confirmacion';
  if (status === 'CONFIRMED') return 'Confirmada';
  if (status === 'COMPLETED') return 'Completada';
  if (status === 'CANCELLED') return 'Cancelada';
  return status;
};

const formatTime = (timeStr: string) => {
  return new Date(timeStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
};
</script>

<template>
  <div class="min-h-screen bg-background text-text font-sans flex flex-col relative overflow-hidden">
    <header class="border-b border-border bg-surface/70 backdrop-blur-md relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="font-display font-semibold text-xl tracking-wide">PORTAL DEL PERSONAL</h1>
          <span class="w-px h-6 bg-border"></span>
          <span class="text-sm text-textMuted" v-if="staffProfile">Bienvenido/a, {{ staffProfile.user.name }}</span>
        </div>
        <button @click="handleLogout" class="text-sm font-medium text-textMuted hover:text-brandDark transition-colors">
          CERRAR SESION
        </button>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full relative z-10" v-if="staffProfile">
      <div class="border-b border-border mb-8">
        <nav class="-mb-px flex space-x-8 overflow-x-auto">
          <button
            @click="activeTab = 'appointments'"
            :class="[activeTab === 'appointments' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm tracking-wide uppercase transition-colors']"
          >
            Agenda
          </button>
          <button
            @click="activeTab = 'history'"
            :class="[activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm tracking-wide uppercase transition-colors']"
          >
            Historial
          </button>
          <button
            @click="activeTab = 'schedule'"
            :class="[activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm tracking-wide uppercase transition-colors']"
          >
            Horario laboral
          </button>
        </nav>
      </div>

      <div v-if="activeTab === 'appointments'" class="animate-fade-in-up">
        <header class="flex justify-between items-end border-b border-border pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Agenda por dia</h3>
            <p class="text-textMuted text-xs uppercase tracking-widest mt-2 font-light">Solo aparecen tus citas asignadas</p>
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
              <h4 class="font-display text-xl text-white">Citas del {{ formatDate(agendaDate) }}</h4>
              <span class="text-xs uppercase tracking-widest text-textMuted">{{ agendaAppointments.length }} cita(s)</span>
            </div>

            <div v-if="agendaAppointments.length === 0" class="py-20 text-center">
              <p class="text-textMuted uppercase tracking-widest text-sm font-light">No hay citas para este dia.</p>
            </div>

            <div v-else class="space-y-3">
              <article v-for="appt in agendaAppointments" :key="appt.id" class="p-4 border border-border rounded-lg bg-surfaceHover/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-start gap-4">
                  <div class="shrink-0 min-w-20 text-center border border-primary/20 bg-primary/5 rounded-md py-2 px-2">
                    <p class="text-sm font-semibold text-primary">{{ formatTime(appt.start_datetime_utc) }}</p>
                    <p class="text-[10px] uppercase tracking-widest text-textMuted">{{ formatTime(appt.end_datetime_utc) }}</p>
                  </div>
                  <div>
                    <h5 class="font-semibold text-text">{{ appt.service?.name }}</h5>
                    <p class="text-xs text-textMuted mt-2">Cliente: {{ appt.client?.user?.name || 'Sin nombre' }}</p>
                    <p class="text-xs text-textMuted">{{ appt.client?.user?.email || '-' }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span :class="['text-xs uppercase tracking-[0.2em] font-medium border-b pb-1', appt.status === 'PENDING_CONFIRMATION' ? 'text-amber-400 border-amber-400/40' : appt.status === 'CONFIRMED' ? 'text-primary border-primary/30' : appt.status === 'COMPLETED' ? 'text-neutral-500 border-neutral-700' : 'text-red-500/70 border-red-900/50']">
                    {{ translateStatus(appt.status) }}
                  </span>
                  <button v-if="appt.status === 'CONFIRMED'" @click="updateAppointmentStatus(appt.id, 'COMPLETED')" class="w-9 h-9 border border-border hover:border-primary text-textMuted hover:text-primary flex items-center justify-center transition-all bg-surface rounded-md" title="Marcar como completada">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button v-if="['PENDING_CONFIRMATION', 'CONFIRMED'].includes(appt.status)" @click="updateAppointmentStatus(appt.id, 'CANCELLED')" class="w-9 h-9 border border-border hover:border-red-400 text-textMuted hover:text-red-600 flex items-center justify-center transition-all bg-surface rounded-md" title="Cancelar">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="animate-fade-in-up">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 class="font-display text-2xl font-semibold">Historial de citas</h2>
          <div class="flex items-center gap-3">
            <select v-model="historyFilterType" class="input-premium py-2 px-3 text-xs w-auto">
              <option value="days">Ultimos dias</option>
              <option value="weeks">Ultimas semanas</option>
            </select>
            <input v-model.number="historyFilterValue" min="1" type="number" class="input-premium py-2 px-3 text-xs w-28" />
          </div>
        </div>

        <div v-if="filteredPastAppointments.length === 0" class="text-center py-16 bg-surface border border-border rounded-lg backdrop-blur-sm">
          <p class="text-sm text-textMuted">No hay citas para el filtro seleccionado.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="appt in filteredPastAppointments" :key="appt.id" class="p-5 bg-surface border border-border rounded-lg flex items-center justify-between gap-4">
            <div>
              <p class="text-xs text-textMuted uppercase tracking-widest">{{ formatDate(appt.start_datetime_utc) }}</p>
              <h3 class="font-medium">{{ appt.service?.name }} - {{ formatTime(appt.start_datetime_utc) }}</h3>
              <p class="text-sm text-textMuted">{{ appt.client?.user?.name || 'Cliente' }}</p>
            </div>
            <span class="text-xs uppercase tracking-widest text-textMuted">{{ translateStatus(appt.status) }}</span>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'schedule'" class="animate-fade-in-up">
        <div class="bg-surface border border-border rounded-xl shadow-xl p-8 max-w-5xl mx-auto backdrop-blur-sm">
          <div class="mb-6">
            <h2 class="font-display text-2xl font-semibold mb-2">Disponibilidad semanal</h2>
            <p class="text-textMuted text-sm">Puedes definir jornada continua o turno partido con dos tramos por dia.</p>
          </div>

          <div class="space-y-4">
            <div v-for="day in scheduleForm" :key="day.day_of_week" class="p-4 rounded-lg bg-surface border border-border">
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

          <div class="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
            <p class="text-sm" :class="saveMsg.includes('Error') || saveMsg.includes('No se pudo') || saveMsg.includes('invalido') || saveMsg.includes('solapan') ? 'text-red-700' : 'text-primary'">{{ saveMsg }}</p>
            <button @click="saveSchedule" class="px-6 py-2.5 bg-primary text-black font-semibold uppercase tracking-widest text-sm hover:bg-primaryHover transition-colors duration-300 rounded-md">
              Guardar horario
            </button>
          </div>
        </div>
      </div>

      <div v-if="showBookingModal" class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-10 md:px-8 md:pt-24 md:pb-12 overflow-y-auto">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showBookingModal = false"></div>
        <div class="w-full max-w-lg my-2 sm:my-3 max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] custom-scrollbar bg-surface border border-border px-6 py-8 sm:px-10 sm:py-10 relative z-10 shadow-xl animate-fade-in-up rounded-xl flex flex-col">
          <h2 class="font-display text-3xl text-white mb-2">Reserva interna</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-border pb-6">La cita se asignara automaticamente a tu agenda</p>

          <form @submit.prevent="handleSaveBooking" class="flex flex-col min-h-0 flex-1">
            <div class="space-y-6 overflow-y-auto pr-1 pb-4">
              <input v-model="newBooking.clientName" type="text" placeholder="NOMBRE DEL CLIENTE" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-model="newBooking.clientEmail" type="email" placeholder="CORREO DEL CLIENTE" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />

              <select v-model="newBooking.serviceId" @change="handleServiceChange" required class="input-premium text-xs tracking-widest text-text">
                <option value="" disabled selected>SERVICIO</option>
                <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
              </select>

              <div v-if="newBooking.serviceId" class="animate-fade-in-up">
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
                  <div class="w-12 h-px bg-primary/30 mb-6"></div>
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
                    ]"
                  >
                    {{ formatTime(slot) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="shrink-0 flex flex-wrap justify-end gap-3 mt-6 pt-6 border-t border-border bg-surface">
              <button type="button" @click="showBookingModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]" :disabled="!newBooking.time">Guardar cita</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

