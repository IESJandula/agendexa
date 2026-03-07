<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = '';
  
  try {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Autenticación denegada');
    if (data.user.role !== 'SUPERADMIN') throw new Error('Nivel de acceso insuficiente');
    
    localStorage.setItem('token', data.token);
    router.push('/superadmin/dashboard');
  } catch (err: any) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-4 relative overflow-hidden min-h-screen">
    
    <!-- Ultra luxe background elements -->
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none"></div>

    <div class="w-full max-w-md p-10 sm:p-14 glass relative z-10 transition-all duration-700 animate-fade-in-up border-t border-t-border border-l border-l-border rounded-xl">
      
      <div class="flex flex-col items-center">
        <div class="w-16 h-16 flex items-center justify-center border border-primary/30 mb-8 text-primary relative overflow-hidden group">
          <div class="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <svg class="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
        </div>
        
        <h2 class="font-display text-2xl tracking-[0.2em] uppercase font-bold mb-2 text-text">Núcleo del sistema</h2>
        <p class="text-textMuted text-xs font-light tracking-widest uppercase mb-10 text-center">Protocolo de acceso superadmin</p>
        
        <form @submit.prevent="handleLogin" class="w-full space-y-8">
          <div class="relative group">
            <input v-model="email" type="email" required class="input-premium bg-transparent border-b-border border-x-0 border-t-0 hover:border-b-primary focus:border-b-primary px-0 pb-2 text-center" placeholder="IDENTIDAD DE ACCESO" />
          </div>
          <div class="relative group mt-6">
            <input v-model="password" type="password" required class="input-premium bg-transparent border-b-border border-x-0 border-t-0 hover:border-b-primary focus:border-b-primary px-0 pb-2 text-center" placeholder="CLAVE DE SEGURIDAD" />
          </div>
          
          <div v-if="errorMsg" class="text-red-700 text-xs tracking-widest uppercase p-4 border border-red-200 bg-red-50 text-center rounded-md">
            {{ errorMsg }}
          </div>
          
          <button type="submit" :disabled="loading" class="btn-primary w-full mt-12 py-5 tracking-[0.3em]">
            <span v-if="!loading">Iniciar sesión</span>
            <span v-else class="animate-pulse">Autenticando</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
