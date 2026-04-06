<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

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
    
    if (res.ok) {
      if (data.user.role !== 'CLIENT') {
        errorMsg.value = 'Esta cuenta no es de cliente.';
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect back to booking if they came from there
      const redirect = route.query.redirect as string;
      if (redirect) {
        router.push(redirect);
      } else {
        router.push('/client/dashboard');
      }
    } else {
      errorMsg.value = data.error || 'Credenciales inválidas';
    }
  } catch (err) {
    errorMsg.value = 'Error al conectar con el servidor';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <!-- Texture & Grain -->
    <div class="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>
    <!-- Flare -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-[100%] blur-[120px] pointer-events-none mix-blend-screen"></div>

    <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
      <div class="mb-10 text-center">
        <h2 class="font-display font-bold text-3xl tracking-wide uppercase text-text mb-2">Iniciar sesión</h2>
        <p class="text-textMuted uppercase tracking-widest text-xs font-light">Acceso para clientes</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6 bg-surface border border-border shadow-xl rounded-xl backdrop-blur-sm p-10 sm:p-12">
        <div v-if="errorMsg" class="p-4 bg-red-50 border border-red-200 text-red-700 text-xs tracking-widest uppercase text-center rounded-md">
          {{ errorMsg }}
        </div>

        <div>
          <label class="block text-textMuted uppercase tracking-widest text-[10px] mb-2 font-semibold">Correo electrónico</label>
          <input v-model="email" type="email" required placeholder="tu@email.com" class="input-premium text-sm tracking-wide transition-all w-full" />
        </div>

        <div>
          <label class="block text-textMuted uppercase tracking-widest text-[10px] mb-2 font-semibold">Contraseña</label>
          <input v-model="password" type="password" required placeholder="••••••••" class="input-premium text-sm tracking-wide transition-all w-full" />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary w-full py-4 tracking-widest text-xs mt-4">
          {{ loading ? 'VERIFICANDO...' : 'ENTRAR A MI CUENTA' }}
        </button>

        <div class="mt-6 text-center text-xs font-light text-textMuted">
          ¿No tienes cuenta? 
          <router-link :to="{ path: '/client/register', query: { redirect: route.query.redirect } }" class="text-brandDark hover:text-primary transition-colors border-b border-primary/30 pb-0.5">
            Regístrate aquí
          </router-link>
        </div>
      </form>
      
      <div class="mt-12 text-center">
        <router-link to="/" class="text-xs text-textMuted uppercase tracking-widest hover:text-brandDark transition-colors">← Volver al inicio</router-link>
      </div>
    </div>
  </div>
</template>
