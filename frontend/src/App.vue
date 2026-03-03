<script setup lang="ts">
// Main App Component
</script>

<template>
  <div class="min-h-screen bg-background text-text font-sans flex flex-col pt-16 selection:bg-primary selection:text-black">
    <!-- Super simple top nav for MVP navigation -->
    <nav class="fixed top-0 w-full h-16 border-b border-primary/20 glass z-50 flex items-center px-8 justify-between">
      <div class="flex items-center gap-3">
        <img
          src="https://res.cloudinary.com/diaiwcmby/image/upload/c_scale,w_72,h_72,f_auto,q_auto/v1754907289/icono1_yye31j.avif"
          alt="Agendexa icon"
          class="w-9 h-9 rounded-lg"
        />
        <router-link to="/" class="font-display font-semibold text-lg tracking-wide hover:text-primary transition-colors">AGENDEXA</router-link>
      </div>
      <div class="flex gap-6 text-sm font-medium items-center">
        <router-link to="/book/pelu" class="text-primary hover:text-white transition-colors border border-primary/30 px-3 py-1 rounded-sm text-xs tracking-widest uppercase">Reservar ahora (Demo)</router-link>
        <span class="w-px h-4 bg-white/10 mx-2"></span>
        <router-link to="/superadmin/login" class="text-textMuted hover:text-white transition-colors">Superadministración</router-link>
        <router-link to="/owner/login" class="text-textMuted hover:text-white transition-colors">Acceso negocio</router-link>
        <router-link to="/staff/login" class="text-textMuted hover:text-white transition-colors">Acceso personal</router-link>
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
