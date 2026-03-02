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
        errorMsg.value = 'Unauthorized. You are not a Staff member.';
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/staff/dashboard');
    } else {
      errorMsg.value = data.error || 'Login failed';
    }
  } catch (err) {
    errorMsg.value = 'Network error. Please try again.';
  }
};
</script>

<template>
  <div class="min-h-screen bg-bgDark flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Dark decorative background -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen"></div>
      <div class="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-accent/10 blur-[150px] rounded-full mix-blend-screen"></div>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
      <h2 class="mt-6 text-center text-4xl font-display font-semibold tracking-wide text-white">
        Staff Portal
      </h2>
      <p class="mt-2 text-center text-sm text-textMuted font-light">
        Manage your schedule and appointments
      </p>
    </div>

    <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up" style="animation-delay: 0.1s;">
      <div class="bg-surface border border-white/5 py-10 px-8 shadow-2xl sm:rounded-xl backdrop-blur-sm">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-widest text-textMuted mb-2">
              Email address
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
              Password
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

          <div v-if="errorMsg" class="text-accent text-sm text-center p-3 rounded-md bg-accent/10 border border-accent/20">
            {{ errorMsg }}
          </div>

          <div>
            <button 
              type="submit" 
              class="group relative flex w-full justify-center border border-transparent bg-primary px-4 py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bgDark"
            >
              Sign in to Workspace
            </button>
          </div>
          
          <div class="mt-6 text-center">
             <router-link to="/" class="text-textMuted hover:text-white transition-colors text-sm">
               &larr; Back to Booking
             </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
