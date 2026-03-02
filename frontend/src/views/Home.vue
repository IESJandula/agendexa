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
          The Platinum Standard
        </span>
      </div>

      <h1 class="font-display text-5xl sm:text-8xl font-black leading-[1.1] mb-8 animate-fade-in-up delay-100 text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-500 drop-shadow-2xl">
        Curate Your <br/>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-200 to-primary">Legacy</span>
      </h1>
      
      <p class="text-lg sm:text-2xl text-textMuted max-w-2xl font-light leading-relaxed animate-fade-in-up delay-200 mb-12">
        An immaculate booking grid engineered to eliminate empty slots and elevate your brand's prestige. Enter the definitive ecosystem for elite salons and studios.
      </p>

      <div class="flex flex-col sm:flex-row gap-6 mt-4 w-full sm:w-auto animate-fade-in-up delay-300">
        <router-link to="/owner/login" class="btn-primary w-full sm:w-auto group">
          <span class="relative z-10 flex items-center gap-3">
            Partner Access
            <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </span>
        </router-link>
        <router-link to="/superadmin/login" class="btn-secondary w-full sm:w-auto">
          System Administration
        </router-link>
      </div>
      
      <!-- Demo link for booking -->
      <div class="mt-24 p-8 glass w-full max-w-3xl flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in-up delay-400 relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <div class="text-left relative z-10">
          <h3 class="font-display font-semibold text-2xl text-white mb-2">Experience The Booking Flow</h3>
          <p class="text-textMuted font-light">Interact with the reservation interface exactly as your clientele would.</p>
        </div>
        <router-link to="/book/pelu" class="relative z-10 px-8 py-3 bg-white text-black font-semibold text-sm uppercase tracking-widest hover:bg-neutral-200 transition-colors shrink-0">
          Demo Booking
        </router-link>
      </div>

    </div>
  </div>
</template>
