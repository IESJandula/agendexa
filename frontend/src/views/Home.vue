<script setup lang="ts">
import { computed, ref } from 'vue';

const searchQuery = ref('');
const searchBy = ref<'name' | 'location'>('name');
type SearchBusiness = {
  id: string;
  name: string;
  slug: string;
  location?: string | null;
};
const searchResults = ref<SearchBusiness[]>([]);
const isSearching = ref(false);

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

let searchTimeout: any = null;

const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
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
  }, 300); // 300ms debounce
};
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-2 sm:px-4 pt-8 pb-10 sm:pb-14 relative overflow-hidden w-full min-h-screen">
    
    <!-- Background Texture & Grain -->
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>

    <!-- Dramatic Light flares -->
    <div class="absolute top-0 right-1/4 w-[800px] h-[500px] bg-primary rounded-[100%] blur-[160px] opacity-[0.06] pointer-events-none transform -translate-y-1/2 rotate-12"></div>
    <div class="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-brandDark rounded-[100%] blur-[180px] opacity-[0.04] pointer-events-none transform translate-y-1/3 -rotate-12"></div>

    <div class="z-10 text-center w-full flex flex-col items-center mt-16 sm:mt-24">
      
      <div class="inline-block mb-8 animate-fade-in-up">
        <span class="px-4 py-1 border border-primary/40 text-brandDark bg-surface/80 text-xs tracking-[0.3em] uppercase backdrop-blur-md rounded-full">
          El estándar premium
        </span>
      </div>

      <h1 class="font-display text-4xl sm:text-7xl lg:text-8xl font-black leading-[1.08] mb-6 sm:mb-8 animate-fade-in-up delay-100 text-transparent bg-clip-text bg-gradient-to-b from-brandDark via-[#0B5F5D] to-[#39CB69]">
        Gestiona tu <br/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brandDark via-primary to-brandDark">legado</span>
      </h1>
      
      <p class="text-base sm:text-xl lg:text-2xl text-textMuted max-w-2xl font-light leading-relaxed animate-fade-in-up delay-200 mb-10 sm:mb-12">
        Un sistema de reservas impecable diseñado para reducir huecos y elevar el prestigio de tu marca. Entra en el ecosistema definitivo para salones y estudios.
      </p>

      <div class="flex flex-col sm:flex-row gap-6 mt-4 w-full sm:w-auto animate-fade-in-up delay-300">
        <router-link to="/owner/login" class="btn-primary w-full sm:w-auto group">
          <span class="relative z-10 flex items-center gap-3">
            Acceso para negocios
            <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </span>
        </router-link>
        <router-link to="/superadmin/login" class="btn-secondary w-full sm:w-auto">
          Administración del sistema
        </router-link>
      </div>
      
      <!-- Search Engine Box -->
      <div class="mt-14 sm:mt-20 mb-8 sm:mb-12 w-full max-w-none px-1 sm:px-2 animate-fade-in-up delay-400 relative">
        <label class="block text-brandDark uppercase tracking-[0.18em] text-sm sm:text-base mb-5 font-semibold text-center">Encuentra tu centro por nombre y ubicación</label>

        <div class="flex items-center justify-center gap-3 mb-4">
          <button
            type="button"
            @click="searchBy = 'name'; handleSearch()"
            :class="searchBy === 'name'
              ? 'bg-brandDark text-surface border-brandDark'
              : 'bg-surface text-brandDark border-border hover:border-brandDark/40'"
            class="px-5 py-2.5 rounded-full border text-sm tracking-wide transition-colors"
          >
            Nombre
          </button>
          <button
            type="button"
            @click="searchBy = 'location'; handleSearch()"
            :class="searchBy === 'location'
              ? 'bg-brandDark text-surface border-brandDark'
              : 'bg-surface text-brandDark border-border hover:border-brandDark/40'"
            class="px-5 py-2.5 rounded-full border text-sm tracking-wide transition-colors"
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
            class="w-full bg-surface border border-border text-text px-6 py-5 sm:py-6 rounded-lg outline-none focus:border-primary/60 focus:bg-surface transition-all font-light tracking-wide text-lg sm:text-xl text-center placeholder:text-center"
          >
          <div v-if="isSearching" class="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Search Results Dropdown -->
        <div v-if="searchQuery && (searchResults.length > 0 || !isSearching)" class="mt-2 bg-surface border border-border z-50 shadow-xl rounded-lg overflow-hidden max-h-[52vh] overflow-y-auto">
          <div v-if="searchResults.length === 0 && !isSearching" class="p-6 text-center text-textMuted font-light text-sm italic">
            {{ noResultsMessage }}
          </div>
          
          <router-link 
            v-for="biz in searchResults" 
            :key="biz.id"
            :to="`/book/${biz.slug}`"
            class="p-5 border-b border-border hover:bg-surfaceHover transition-colors group flex items-center justify-between"
          >
            <div>
              <h4 class="font-display text-xl text-text group-hover:text-brandDark transition-colors">{{ biz.name }}</h4>
              <p v-if="biz.location" class="text-xs text-brandDark/70 mt-1">{{ biz.location }}</p>
              <p class="text-xs text-textMuted uppercase tracking-widest mt-1">/{{ biz.slug }}</p>
            </div>
            <svg class="w-5 h-5 text-textMuted group-hover:text-brandDark transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M9 5l7 7-7 7" /></svg>
          </router-link>
        </div>
      </div>

    </div>

    <footer class="z-10 w-full mt-6 sm:mt-8">
      <div class="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-5"></div>
      <div class="glass px-5 sm:px-8 py-5 rounded-xl border border-border/70 flex flex-col items-center justify-center gap-3 text-center">
        <div class="flex items-center justify-center gap-3">
          <span class="px-3 py-1 rounded-full bg-primary/15 text-brandDark border border-primary/35 text-[10px] tracking-[0.2em] uppercase font-semibold">Agendexa</span>
          <p class="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-textMuted">Reservas simples, clientes felices</p>
        </div>
        <p class="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-textMuted">2026. Todos los derechos reservados.</p>
      </div>
    </footer>
  </div>
</template>
