<script setup lang="ts">
import { ref } from 'vue';

const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const isSearching = ref(false);

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
      const res = await fetch(`http://localhost:3000/public/businesses/search?q=${encodeURIComponent(searchQuery.value)}`);
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
  <div class="flex flex-col items-center justify-center flex-1 px-4 sm:px-8 relative overflow-hidden w-full min-h-screen">
    
    <!-- Background Texture & Grain -->
    <div class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>

    <!-- Dramatic Light flares -->
    <div class="absolute top-0 right-1/4 w-[800px] h-[500px] bg-primary rounded-[100%] blur-[150px] opacity-[0.07] pointer-events-none transform -translate-y-1/2 rotate-12"></div>
    <div class="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-primary rounded-[100%] blur-[180px] opacity-[0.05] pointer-events-none transform translate-y-1/3 -rotate-12"></div>

    <div class="z-10 text-center max-w-5xl flex flex-col items-center w-full mt-24">
      
      <div class="inline-block mb-8 animate-fade-in-up">
        <span class="px-4 py-1 border border-primary/30 text-primary text-xs tracking-[0.3em] uppercase backdrop-blur-md">
          El estándar premium
        </span>
      </div>

      <h1 class="font-display text-5xl sm:text-8xl font-black leading-[1.1] mb-8 animate-fade-in-up delay-100 text-transparent bg-clip-text bg-gradient-to-b from-white via-[#DFF7E7] to-[#7CC89A] drop-shadow-2xl">
        Gestiona tu <br/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#9EF0BC] to-primary">legado</span>
      </h1>
      
      <p class="text-lg sm:text-2xl text-textMuted max-w-2xl font-light leading-relaxed animate-fade-in-up delay-200 mb-12">
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
      <div class="mt-20 w-full max-w-2xl px-4 animate-fade-in-up delay-400 relative">
        <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold text-center">Encuentra tu centro</label>
        
        <div class="relative">
          <input 
            v-model="searchQuery"
            @input="handleSearch"
            type="search" 
            placeholder="Ej: Peluquería Luis, Uñas de Cristal..." 
            class="w-full bg-black/40 border border-white/10 text-white px-6 py-5 rounded-none outline-none focus:border-primary/50 focus:bg-black/60 transition-all font-light tracking-wide text-lg"
          >
          <div v-if="isSearching" class="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Search Results Dropdown -->
        <div v-if="searchQuery && (searchResults.length > 0 || !isSearching)" class="absolute left-4 right-4 mt-2 bg-black border border-white/10 z-50 shadow-2xl">
          <div v-if="searchResults.length === 0 && !isSearching" class="p-6 text-center text-textMuted font-light text-sm italic">
            No se encontraron negocios con ese nombre.
          </div>
          
          <router-link 
            v-for="biz in searchResults" 
            :key="biz.id"
            :to="`/book/${biz.slug}`"
            class="block p-5 border-b border-white/5 hover:bg-white/5 transition-colors group flex items-center justify-between"
          >
            <div>
              <h4 class="font-display text-xl text-white group-hover:text-primary transition-colors">{{ biz.name }}</h4>
              <p class="text-xs text-textMuted uppercase tracking-widest mt-1">/{{ biz.slug }}</p>
            </div>
            <svg class="w-5 h-5 text-textMuted group-hover:text-primary transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M9 5l7 7-7 7" /></svg>
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>
