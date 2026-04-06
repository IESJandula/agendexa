<script setup lang="ts">
// Main App Component
import agendexaLogo from './assets/agendexa-favicon.png';
</script>

<template>
  <div class="min-h-screen bg-background text-text font-sans flex flex-col pt-20 selection:bg-primary selection:text-black">
    <!-- Super simple top nav for MVP navigation -->
    <nav class="fixed top-0 w-full h-20 border-b border-border glass z-50 flex items-center px-5 sm:px-10 justify-between">
      <div class="flex items-center gap-3">
        <router-link to="/" class="flex items-center gap-3" aria-label="Ir a la pagina principal de Agendexa" title="Agendexa - Sistema Inteligente de Reservas">
          <img
            :src="agendexaLogo"
            alt="Logo Agendexa"
            width="72"
            height="72"
            loading="eager"
            fetchpriority="high"
            decoding="sync"
            class="w-14 h-14"
          />
          <span class="font-display font-bold text-3xl tracking-tight leading-tight flex gap-0.5">
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
      </div>
      <div class="flex gap-3 sm:gap-7 text-xs sm:text-base font-medium items-center overflow-x-auto whitespace-nowrap max-w-[70vw] sm:max-w-none">
        <router-link to="/superadmin/login" class="text-textMuted hover:text-brandDark transition-colors">Superadministración</router-link>
        <router-link to="/owner/login" class="text-textMuted hover:text-brandDark transition-colors">Acceso negocio</router-link>
        <router-link to="/staff/login" class="text-textMuted hover:text-brandDark transition-colors">Acceso personal</router-link>
        <span class="w-px h-5 bg-border mx-2"></span>
        <router-link to="/client/login" class="text-brandDark font-medium hover:text-primary transition-colors flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          Área Cliente
        </router-link>
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
