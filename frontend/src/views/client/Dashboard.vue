<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(true);
const appointments = ref<any[]>([]);
const userName = ref('');
const errorMsg = ref('');

const fetchAppointments = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/client/login');
    return;
  }
  
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    userName.value = user.name;
    if (user.role !== 'CLIENT') {
       router.push('/');
       return;
    }
  }

  loading.value = true;
  try {
    const res = await fetch('http://localhost:3000/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      appointments.value = await res.json();
    } else {
      errorMsg.value = 'Failed to load appointments.';
    }
  } catch (err) {
    errorMsg.value = 'Network error.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchAppointments();
});

const activeTab = ref('upcoming');

const upcomingAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter(a => new Date(a.start_datetime_utc) >= now && a.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.start_datetime_utc).getTime() - new Date(b.start_datetime_utc).getTime());
});

const pastAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter(a => new Date(a.start_datetime_utc) < now || a.status !== 'CONFIRMED')
    .sort((a, b) => new Date(b.start_datetime_utc).getTime() - new Date(a.start_datetime_utc).getTime());
});

const cancelAppointment = async (id: string) => {
  if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;
  
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`http://localhost:3000/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'CANCELLED' })
    });
    if (res.ok) {
      fetchAppointments();
    } else {
      alert('Hubo un error al cancelar.');
    }
  } catch (err) {
    console.error(err);
  }
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/');
};

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const translateStatus = (status: string) => {
  if (status === 'CONFIRMED') return 'Confirmada';
  if (status === 'COMPLETED') return 'Completada';
  if (status === 'CANCELLED') return 'Cancelada';
  return status;
};
</script>

<template>
  <div class="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-10 pt-8 flex flex-col md:flex-row gap-8 lg:gap-16 min-h-screen relative overflow-hidden">
    
    <!-- Background textures -->
    <div class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <aside class="w-full md:w-64 shrink-0 flex flex-col relative z-10 animate-fade-in-up">
      <div class="mb-12">
        <h2 class="font-display font-medium text-2xl tracking-wide uppercase text-white">Hola,</h2>
        <h2 class="font-display font-light text-xl tracking-wide text-primary">{{ userName }}</h2>
        <div class="h-[1px] w-12 bg-primary mt-4"></div>
      </div>

      <nav class="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        <button 
          @click="activeTab = 'upcoming'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 text-xs font-semibold tracking-widest uppercase', activeTab === 'upcoming' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white hover:border-white/20']">
          Próximas
        </button>
        <button 
          @click="activeTab = 'past'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 text-xs font-semibold tracking-widest uppercase', activeTab === 'past' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white hover:border-white/20']">
          Historial
        </button>
      </nav>

      <div class="mt-auto pt-16 flex flex-col gap-3">
        <router-link to="/" class="w-full text-center px-6 py-4 bg-primary text-[#060606] font-semibold text-xs tracking-widest uppercase hover:bg-primaryHover transition-all">
          Reservar cita
        </router-link>
        <button @click="logout" class="w-full px-6 py-4 border border-white/10 hover:border-textMuted text-xs font-semibold tracking-widest uppercase text-textMuted hover:text-white transition-all">
          Cerrar sesión
        </button>
      </div>
    </aside>

    <main class="flex-1 relative z-10">
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-50">
         <div class="w-8 h-8 border border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full mb-4"></div>
         <p class="text-primary font-light tracking-[0.3em] text-[10px] uppercase">Cargando...</p>
      </div>

      <div v-show="activeTab === 'upcoming'" class="animate-fade-in-up delay-100 flex flex-col h-full">
        <header class="border-b border-white/10 pb-6 mb-8">
          <h3 class="font-display text-2xl text-white">Tus próximas citas</h3>
        </header>

        <div v-if="upcomingAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 border border-white/5 bg-black/20 text-center">
          <div class="w-16 h-[1px] bg-primary/30 mb-6"></div>
          <p class="text-textMuted font-light text-sm mb-6 max-w-sm px-4">No tienes ninguna reserva activa. Encuentra tu centro favorito y eleva tu estilo.</p>
          <router-link to="/" class="btn-primary text-xs tracking-widest px-8">Explorar negocios</router-link>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in upcomingAppointments" :key="app.id" class="p-6 bg-black/40 border border-white/5 hover:border-primary/30 transition-all flex flex-col sm:flex-row justify-between gap-6 relative group overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div>
              <p class="text-[10px] text-primary uppercase tracking-[0.2em] mb-1 font-semibold">{{ app.business.name }}</p>
              <h4 class="font-display text-xl text-white mb-2">{{ app.service.name }}</h4>
              <p class="text-xs text-textMuted font-light mb-1">Con {{ app.staff.user.name }}</p>
              <p class="text-xs text-white uppercase tracking-widest mt-4">{{ formatDate(app.start_datetime_utc) }} as {{ formatTime(app.start_datetime_utc) }}</p>
            </div>
            
            <div class="flex flex-col justify-between items-end">
              <span class="text-[10px] px-3 py-1 bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                {{ translateStatus(app.status) }}
              </span>
              <button @click="cancelAppointment(app.id)" class="text-red-500/70 hover:text-red-400 text-xs tracking-widest border-b border-red-900/50 hover:border-red-500 pb-0.5 transition-all mt-4 sm:mt-0">
                Cancelar Reserva
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'past'" class="animate-fade-in-up delay-100 flex flex-col h-full">
        <header class="border-b border-white/10 pb-6 mb-8">
          <h3 class="font-display text-2xl text-white">Historial de citas</h3>
        </header>

        <div v-if="pastAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 border border-white/5 bg-black/20 text-center">
          <p class="text-textMuted font-light italic text-sm">No hay citas pasadas registradas.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in pastAppointments" :key="app.id" class="p-6 bg-black/20 border border-white/5 flex flex-col sm:flex-row justify-between gap-6 opacity-70 hover:opacity-100 transition-opacity">
            <div>
              <p class="text-[10px] text-textMuted uppercase tracking-[0.2em] mb-1">{{ app.business.name }}</p>
              <h4 class="font-display text-lg text-white mb-1">{{ app.service.name }}</h4>
              <p class="text-xs text-textMuted font-light">{{ formatDate(app.start_datetime_utc) }} - {{ formatTime(app.start_datetime_utc) }}</p>
            </div>
            <div class="flex items-start">
              <span :class="['text-[10px] px-3 py-1 uppercase tracking-widest border', 
                app.status === 'COMPLETED' ? 'bg-white/5 text-neutral-400 border-white/10' : 'bg-red-900/10 text-red-500/70 border-red-900/30']">
                {{ translateStatus(app.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>
