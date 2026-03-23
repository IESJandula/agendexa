<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

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
const appointments = ref<any[]>([]);
const activeTab = ref('appointments');
const saveMsg = ref('');

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
  hydrateScheduleForm(staffProfile.value?.schedules || []);
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

const upcomingAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter((a) => new Date(a.start_datetime_utc) >= now && a.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.start_datetime_utc).getTime() - new Date(b.start_datetime_utc).getTime());
});

const pastAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter((a) => new Date(a.start_datetime_utc) < now || a.status !== 'CONFIRMED')
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

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/staff/login');
};

const translateStatus = (status: string) => {
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
            Mis citas
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
        <div class="flex justify-between items-center mb-6">
          <h2 class="font-display text-2xl font-semibold">Proximas reservas</h2>
        </div>

        <div v-if="upcomingAppointments.length === 0" class="text-center py-16 bg-surface border border-border rounded-lg backdrop-blur-sm">
          <h3 class="text-lg font-medium text-text mb-1">No hay proximas citas</h3>
          <p class="text-sm text-textMuted">Tu agenda esta despejada.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="appt in upcomingAppointments" :key="appt.id" class="p-6 bg-surface border border-border rounded-lg hover:border-primary/50 transition-colors group">
            <div class="flex justify-between items-start mb-4">
              <div>
                <p class="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{{ formatDate(appt.start_datetime_utc) }}</p>
                <h3 class="font-medium text-text text-lg">{{ formatTime(appt.start_datetime_utc) }} - {{ formatTime(appt.end_datetime_utc) }}</h3>
              </div>
              <span class="px-2 py-1 text-xs font-medium bg-surfaceHover rounded text-textMuted border border-border">{{ translateStatus(appt.status) }}</span>
            </div>

            <div class="space-y-3">
              <p class="text-sm font-medium text-text">{{ appt.client?.user?.name || 'Cliente' }}</p>
              <p class="text-xs text-textMuted break-all" :title="appt.client?.user?.email || '-'">{{ appt.client?.user?.email || '-' }}</p>
              <p class="text-sm text-text">{{ appt.service?.name }}</p>
              <p class="text-xs text-textMuted">{{ appt.service?.duration_min }} min</p>
            </div>
          </div>
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
    </main>
  </div>
</template>

