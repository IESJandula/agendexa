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
    if (!res.ok) throw new Error(data.error || 'Acceso denegado');
    if (data.user.role !== 'OWNER' && data.user.role !== 'STAFF') throw new Error('Se requieren permisos de negocio.');
    
    localStorage.setItem('token', data.token);
    router.push('/owner/dashboard');
  } catch (err: any) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
      <div class="bg-surface border border-border shadow-xl rounded-xl backdrop-blur-sm p-10 sm:p-12">
        <div class="mb-10 text-center">
          <h2 class="font-display text-3xl font-bold mb-2 text-text">Portal de negocio</h2>
          <p class="text-textMuted text-xs font-light tracking-widest uppercase">Gestión de recursos del negocio</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <input v-model="email" type="email" required class="input-premium text-sm tracking-widest" placeholder="CORREO REGISTRADO" />
          </div>
          <div>
            <input v-model="password" type="password" required class="input-premium text-sm tracking-widest" placeholder="CONTRASEÑA" />
          </div>

          <div v-if="errorMsg" class="text-red-700 text-xs tracking-widest uppercase mt-4 text-center bg-red-50 border border-red-200 rounded-md p-3">
            {{ errorMsg }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full mt-10 py-5 tracking-[0.2em]">
            <span v-if="!loading">Iniciar sesión</span>
            <span v-else class="animate-pulse">Conectando</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
