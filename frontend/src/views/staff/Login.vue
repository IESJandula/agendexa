<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const router = useRouter();

const handleLogin = async () => {
  errorMsg.value = '';
  try {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      if (data.user.role !== 'STAFF') {
        errorMsg.value = 'No autorizado. No eres miembro del personal.';
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/staff/dashboard');
    } else {
      errorMsg.value = data.error || 'Error al iniciar sesión';
    }
  } catch (err) {
    errorMsg.value = 'Error de red. Inténtalo de nuevo.';
  }
};
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Dark decorative background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen"></div>
      <div class="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen"></div>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <h2 class="mt-6 text-center text-4xl font-display font-semibold tracking-wide text-white">
        Portal del personal
      </h2>
      <p class="mt-2 text-center text-sm text-textMuted font-light">
        Gestiona tu horario y tus citas
      </p>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up" style="animation-delay: 0.1s;">
      <div class="bg-surface border border-white/5 py-10 px-8 shadow-2xl sm:rounded-xl backdrop-blur-sm">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-widest text-textMuted mb-2">
              Correo electrónico
            </label>
            <div class="mt-1">
              <input 
                id="email" 
                v-model="email" 
                type="email" 
                required 
                class="block w-full appearance-none rounded-none border-0 border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder-white/30 focus:border-primary focus:ring-0 transition-colors sm:text-sm" 
                placeholder="staff@booksy-mvp.com" 
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-widest text-textMuted mb-2">
              Contraseña
            </label>
            <div class="mt-1">
              <input 
                id="password" 
                v-model="password" 
                type="password" 
                required 
                class="block w-full appearance-none rounded-none border-0 border-b border-white/20 bg-transparent px-0 py-3 text-white placeholder-white/30 focus:border-primary focus:ring-0 transition-colors sm:text-sm" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div v-if="errorMsg" class="text-red-100 text-sm text-center p-3 rounded-md bg-red-500/15 border border-red-400/40">
            {{ errorMsg }}
          </div>

          <div>
            <button 
              type="submit" 
              class="group relative flex w-full justify-center border border-transparent bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              Entrar al panel
            </button>
          </div>
          
          <div class="mt-6 text-center">
             <router-link to="/" class="text-textMuted hover:text-white transition-colors text-sm">
               &larr; Volver a reservas
             </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
