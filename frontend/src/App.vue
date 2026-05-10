<script setup lang="ts">
// Main App Component
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import agendexaLogo from './assets/agendexa-favicon.png';

const route = useRoute();
const isMobileMenuOpen = ref(false);

watch(
  () => route.fullPath,
  () => {
    isMobileMenuOpen.value = false;
  }
);
</script>

<template>
  <div class="min-h-screen bg-background text-text font-sans flex flex-col pt-20 md:pt-24 selection:bg-primary selection:text-black overflow-x-hidden">
    <nav class="app-topbar fixed top-0 inset-x-0 z-50">
      <div class="w-full px-4 sm:px-6 lg:px-10 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
        <router-link to="/" class="flex items-center gap-3" aria-label="Ir a la pagina principal de Agendexa" title="Agendexa - Sistema Inteligente de Reservas">
          <img
            :src="agendexaLogo"
            alt="Logo Agendexa"
            width="72"
            height="72"
            loading="eager"
            fetchpriority="high"
            decoding="sync"
            class="w-11 h-11 md:w-14 md:h-14 shrink-0"
          />
          <span class="font-display font-bold text-xl md:text-3xl tracking-tight leading-tight flex gap-0.5">
            <span class="text-brandDark">A</span>
            <span class="text-brandDark">g</span>
            <span class="text-brandDark">e</span>
            <span class="text-brandDark">n</span>
            <span class="text-brandDark">d</span>
            <span class="text-brandDark">e</span>
            <span class="text-primary font-black">x</span>
            <span class="text-brandDark">a</span>
          </span>
        </router-link>

        <button
          type="button"
          class="md:hidden inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brandDark"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="main-navigation"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          {{ isMobileMenuOpen ? 'Cerrar' : 'Menú' }}
        </button>

        <div
          id="main-navigation"
          :class="[
            'w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm font-medium',
            isMobileMenuOpen ? 'flex' : 'hidden md:flex',
            'md:w-auto md:flex-row md:items-center md:gap-6 md:text-sm'
          ]"
        >
          <router-link to="/superadmin/login" class="rounded-md px-3 py-2 text-textMuted hover:text-brandDark hover:bg-surface transition-colors">Superadministración</router-link>
          <router-link to="/owner/login" class="rounded-md px-3 py-2 text-textMuted hover:text-brandDark hover:bg-surface transition-colors">Acceso negocio</router-link>
          <router-link to="/staff/login" class="rounded-md px-3 py-2 text-textMuted hover:text-brandDark hover:bg-surface transition-colors">Acceso personal</router-link>
          <span class="hidden md:block w-px h-5 bg-border"></span>
          <router-link to="/client/login" class="rounded-md px-3 py-2 text-brandDark font-medium hover:text-primary hover:bg-surface transition-colors flex items-center gap-1.5 md:justify-start">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          Área Cliente
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content Appears Here -->
    <main class="flex-1 w-full flex flex-col relative">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
