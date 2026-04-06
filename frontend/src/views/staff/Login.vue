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
  <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <!-- Decorative background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen"></div>
      <div class="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen"></div>
    </div>

    <div class="w-full max-w-lg relative z-10 animate-fade-in-up">
      <div class="bg-surface border border-border shadow-xl rounded-xl backdrop-blur-sm p-10 sm:p-12">
        <div class="mb-10 text-center">
          <h2 class="font-display text-3xl font-bold mb-2 text-text">Portal del personal</h2>
          <p class="text-textMuted text-xs font-light tracking-widest uppercase">Gestiona tu horario y tus citas</p>
        </div>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-widest text-textMuted mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input-premium text-sm tracking-wide transition-all w-full"
              placeholder="staff@booksy-mvp.com"
            />
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-widest text-textMuted mb-2">
              Contraseña
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="input-premium text-sm tracking-wide transition-all w-full"
              placeholder="••••••••"
            />
          </div>

          <div v-if="errorMsg" class="text-red-700 text-sm text-center p-3 rounded-md bg-red-50 border border-red-200">
            {{ errorMsg }}
          </div>

          <div>
            <button 
              type="submit" 
              class="btn-primary w-full py-4 tracking-widest text-xs"
            >
              Entrar al panel
            </button>
          </div>
          
          <div class="mt-6 text-center">
             <router-link to="/" class="text-textMuted hover:text-brandDark transition-colors text-sm">
               &larr; Volver a reservas
             </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
