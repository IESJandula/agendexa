<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

type SearchBusiness = {
  id: string;
  name: string;
  slug: string;
  location?: string | null;
};

const router = useRouter();
const loading = ref(true);
const appointments = ref<any[]>([]);
const userName = ref('');
const errorMsg = ref('');
const activeTab = ref<'upcoming' | 'past' | 'discover'>('upcoming');

const searchQuery = ref('');
const searchBy = ref<'name' | 'location'>('name');
const searchResults = ref<SearchBusiness[]>([]);
const isSearching = ref(false);
const favoriteBusinesses = ref<SearchBusiness[]>([]);

let searchTimeout: any = null;

const FAVORITES_KEY = 'clientFavoriteBusinesses';

const searchPlaceholder = computed(() =>
  searchBy.value === 'location'
    ? 'Ej: Madrid, Valencia, Sevilla...'
    : 'Ej: Peluqueria Luis, Unas de Cristal...'
);

const noResultsMessage = computed(() =>
  searchBy.value === 'location'
    ? 'No se encontraron negocios en esa ubicacion.'
    : 'No se encontraron negocios con ese nombre.'
);

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    favoriteBusinesses.value = raw ? JSON.parse(raw) : [];
  } catch {
    favoriteBusinesses.value = [];
  }
};

const persistFavorites = () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteBusinesses.value));
};

const isFavorite = (slug: string) => favoriteBusinesses.value.some((biz) => biz.slug === slug);

const toggleFavorite = (biz: SearchBusiness) => {
  if (isFavorite(biz.slug)) {
    favoriteBusinesses.value = favoriteBusinesses.value.filter((saved) => saved.slug !== biz.slug);
  } else {
    favoriteBusinesses.value = [biz, ...favoriteBusinesses.value].slice(0, 20);
  }
  persistFavorites();
};

const goToBooking = (slug: string) => {
  router.push(`/book/${slug}`);
};

const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);

  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`http://localhost:3000/public/businesses/search?q=${encodeURIComponent(searchQuery.value)}&by=${searchBy.value}`);
      if (res.ok) {
        searchResults.value = await res.json();
      }
    } catch (e) {
      console.error('Error searching businesses', e);
    } finally {
      isSearching.value = false;
    }
  }, 250);
};

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
  loadFavorites();
  fetchAppointments();
});

const upcomingAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter(a => new Date(a.start_datetime_utc) >= now && ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(a.status))
    .sort((a, b) => new Date(a.start_datetime_utc).getTime() - new Date(b.start_datetime_utc).getTime());
});

const pastAppointments = computed(() => {
  const now = new Date();
  return appointments.value
    .filter(a => new Date(a.start_datetime_utc) < now || ['COMPLETED', 'CANCELLED'].includes(a.status))
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
  if (status === 'PENDING_CONFIRMATION') return 'Pendiente de confirmacion';
  if (status === 'CONFIRMED') return 'Confirmada';
  if (status === 'COMPLETED') return 'Completada';
  if (status === 'CANCELLED') return 'Cancelada';
  return status;
};
</script>

<template>
  <div class="flex-1 w-full max-w-none p-2 sm:p-3 md:p-4 pt-4 md:pt-5 flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-16 min-h-screen relative overflow-hidden">
    
    <!-- Background textures -->
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <aside class="w-full md:w-64 shrink-0 flex flex-col relative z-10 animate-fade-in-up">
      <div class="mb-12">
        <h2 class="font-display font-medium text-2xl tracking-wide uppercase text-text">Hola,</h2>
        <h2 class="font-display font-light text-xl tracking-wide text-primary">{{ userName }}</h2>
        <div class="h-[1px] w-12 bg-primary mt-4"></div>
      </div>

      <nav class="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        <button 
          @click="activeTab = 'upcoming'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 text-xs font-semibold tracking-widest uppercase', activeTab === 'upcoming' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Próximas
        </button>
        <button 
          @click="activeTab = 'past'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 text-xs font-semibold tracking-widest uppercase', activeTab === 'past' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Historial
        </button>
        <button
          @click="activeTab = 'discover'"
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 text-xs font-semibold tracking-widest uppercase', activeTab === 'discover' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-brandDark hover:border-primary/30']">
          Reservar
        </button>
      </nav>

      <div class="mt-auto pt-16 flex flex-col gap-3">
        <button @click="activeTab = 'discover'" class="w-full text-center px-6 py-4 bg-primary text-black font-semibold text-xs tracking-widest uppercase hover:bg-primaryHover transition-all">
          Reservar cita
        </button>
        <button @click="logout" class="w-full px-6 py-4 border border-border hover:border-primary/40 text-xs font-semibold tracking-widest uppercase text-textMuted hover:text-brandDark transition-all rounded-md bg-surface">
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
        <header class="border-b border-border pb-6 mb-8">
          <h3 class="font-display text-2xl text-text">Tus próximas citas</h3>
        </header>

        <div v-if="upcomingAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 border border-border bg-surface text-center rounded-xl">
          <div class="w-16 h-[1px] bg-primary/30 mb-6"></div>
          <p class="text-textMuted font-light text-sm mb-6 max-w-sm px-4">No tienes ninguna reserva activa. Encuentra tu centro favorito y eleva tu estilo.</p>
          <button @click="activeTab = 'discover'" class="btn-primary text-xs tracking-widest px-8">Explorar negocios</button>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in upcomingAppointments" :key="app.id" class="p-6 bg-surface border border-border hover:border-primary/30 transition-all flex flex-col sm:flex-row justify-between gap-6 relative group overflow-hidden rounded-xl">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div>
              <p class="text-[10px] text-primary uppercase tracking-[0.2em] mb-1 font-semibold">{{ app.business.name }}</p>
              <h4 class="font-display text-xl text-text mb-2">{{ app.service.name }}</h4>
              <p class="text-xs text-textMuted font-light mb-1">Con {{ app.staff.user.name }}</p>
              <p class="text-xs text-text uppercase tracking-widest mt-4">{{ formatDate(app.start_datetime_utc) }} as {{ formatTime(app.start_datetime_utc) }}</p>
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
        <header class="border-b border-border pb-6 mb-8">
          <h3 class="font-display text-2xl text-text">Historial de citas</h3>
        </header>

        <div v-if="pastAppointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-20 border border-border bg-surface text-center rounded-xl">
          <p class="text-textMuted font-light italic text-sm">No hay citas pasadas registradas.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in pastAppointments" :key="app.id" class="p-6 bg-surface border border-border flex flex-col sm:flex-row justify-between gap-6 opacity-80 hover:opacity-100 transition-opacity rounded-xl">
            <div>
              <p class="text-[10px] text-textMuted uppercase tracking-[0.2em] mb-1">{{ app.business.name }}</p>
              <h4 class="font-display text-lg text-text mb-1">{{ app.service.name }}</h4>
              <p class="text-xs text-textMuted font-light">{{ formatDate(app.start_datetime_utc) }} - {{ formatTime(app.start_datetime_utc) }}</p>
            </div>
            <div class="flex items-start">
              <span :class="['text-[10px] px-3 py-1 uppercase tracking-widest border', 
                app.status === 'COMPLETED' ? 'bg-surfaceHover text-textMuted border-border' : 'bg-red-50 text-red-700 border-red-200']">
                {{ translateStatus(app.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'discover'" class="animate-fade-in-up delay-100 flex flex-col h-full gap-6">
        <header class="border-b border-border pb-6">
          <h3 class="font-display text-2xl text-text">Reserva tu proxima cita</h3>
          <p class="text-xs text-textMuted uppercase tracking-widest mt-2">Busca por nombre o ubicacion sin salir del panel</p>
        </header>

        <section class="p-6 bg-surface border border-border rounded-xl">
          <label class="block text-brandDark uppercase tracking-widest text-[10px] mb-4 font-semibold">Buscador de negocios</label>

          <div class="flex items-center justify-start gap-2 mb-3">
            <button
              type="button"
              @click="searchBy = 'name'; handleSearch()"
              :class="searchBy === 'name' ? 'bg-brandDark text-surface border-brandDark' : 'bg-surface text-brandDark border-border hover:border-brandDark/40'"
              class="px-3 py-1.5 rounded-full border text-xs tracking-wide transition-colors"
            >
              Nombre
            </button>
            <button
              type="button"
              @click="searchBy = 'location'; handleSearch()"
              :class="searchBy === 'location' ? 'bg-brandDark text-surface border-brandDark' : 'bg-surface text-brandDark border-border hover:border-brandDark/40'"
              class="px-3 py-1.5 rounded-full border text-xs tracking-wide transition-colors"
            >
              Ubicacion
            </button>
          </div>

          <div class="relative">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              type="search"
              :placeholder="searchPlaceholder"
              class="w-full bg-surface border border-border text-text px-6 py-4 rounded-lg outline-none focus:border-primary/60 focus:bg-surface transition-all font-light tracking-wide"
            >
            <div v-if="isSearching" class="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </section>

        <section class="p-6 bg-surface border border-border rounded-xl" v-if="favoriteBusinesses.length > 0">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-display text-xl text-text">Tus favoritos</h4>
            <span class="text-xs uppercase tracking-widest text-textMuted">{{ favoriteBusinesses.length }} guardado(s)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <article v-for="biz in favoriteBusinesses" :key="`fav-${biz.slug}`" class="p-4 border border-border rounded-lg bg-surfaceHover/30 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h5 class="font-semibold text-text truncate">{{ biz.name }}</h5>
                <p v-if="biz.location" class="text-xs text-textMuted truncate">{{ biz.location }}</p>
                <p class="text-[10px] uppercase tracking-widest text-textMuted">/{{ biz.slug }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button @click="toggleFavorite(biz)" class="px-3 py-2 text-[10px] uppercase tracking-widest border border-border rounded hover:border-primary/40">
                  Quitar
                </button>
                <button @click="goToBooking(biz.slug)" class="px-3 py-2 text-[10px] uppercase tracking-widest bg-primary text-black rounded hover:bg-primaryHover transition-colors">
                  Reservar
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="p-6 bg-surface border border-border rounded-xl">
          <h4 class="font-display text-xl text-text mb-4">Resultados</h4>

          <div v-if="!searchQuery" class="text-sm text-textMuted">Escribe para buscar negocios.</div>
          <div v-else-if="searchResults.length === 0 && !isSearching" class="text-sm text-textMuted">{{ noResultsMessage }}</div>

          <div v-else class="space-y-3">
            <article v-for="biz in searchResults" :key="biz.id" class="p-4 border border-border rounded-lg bg-surfaceHover/20 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h5 class="font-semibold text-text truncate">{{ biz.name }}</h5>
                <p v-if="biz.location" class="text-xs text-textMuted truncate">{{ biz.location }}</p>
                <p class="text-[10px] uppercase tracking-widest text-textMuted">/{{ biz.slug }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button @click="toggleFavorite(biz)" class="px-3 py-2 text-[10px] uppercase tracking-widest border rounded transition-colors" :class="isFavorite(biz.slug) ? 'border-primary text-primary' : 'border-border hover:border-primary/40'">
                  {{ isFavorite(biz.slug) ? 'Favorito' : 'Favorito' }}
                </button>
                <button @click="goToBooking(biz.slug)" class="px-3 py-2 text-[10px] uppercase tracking-widest bg-primary text-black rounded hover:bg-primaryHover transition-colors">
                  Reservar
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

    </main>
  </div>
</template>
