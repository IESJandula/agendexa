<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const businesses = ref<any[]>([]);
const loading = ref(true);

const showAddModal = ref(false);
const newBusiness = ref({
  name: '',
  slug: '',
  phone: '',
  settings: { slot_interval_minutes: 30 },
  ownerName: '',
  ownerEmail: '',
  ownerPassword: ''
});

const fetchBusinesses = async () => {
  const token = localStorage.getItem('token');
  if (!token) return router.push('/superadmin/login');
  
  try {
    const res = await fetch('http://localhost:3000/admin/businesses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      businesses.value = await res.json();
    }
  } catch (error) {
    console.error('Error fetching businesses:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBusinesses();
});

const handleCreateBusiness = async () => {
  const token = localStorage.getItem('token');
  try {
    const payload = {
      businessName: newBusiness.value.name,
      businessSlug: newBusiness.value.slug,
      businessPhone: newBusiness.value.phone,
      slotIntervalMinutes: newBusiness.value.settings.slot_interval_minutes,
      ownerName: newBusiness.value.ownerName,
      ownerEmail: newBusiness.value.ownerEmail,
      ownerPassword: newBusiness.value.ownerPassword
    };

    const res = await fetch('http://localhost:3000/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showAddModal.value = false;
      newBusiness.value = { name: '', slug: '', phone: '', settings: { slot_interval_minutes: 30 }, ownerName: '', ownerEmail: '', ownerPassword: '' };
      fetchBusinesses();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    console.error(err);
  }
};

const logout = () => {
  localStorage.removeItem('token');
  router.push('/');
};
</script>

<template>
  <div class="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-10 pt-8 min-h-screen relative overflow-hidden">
    
    <!-- Ultra luxe background elements -->
    <div class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute -top-32 -right-32 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 relative z-10 animate-fade-in-up">
      <div>
        <h1 class="font-display font-medium text-4xl text-white mb-2 tracking-wide">Centro de red</h1>
        <p class="text-textMuted uppercase tracking-widest text-xs font-light">Gestión global de infraestructura</p>
      </div>
      <div class="mt-6 sm:mt-0 flex gap-4">
        <button @click="showAddModal = true" class="btn-primary py-3 px-6 tracking-widest">+ Crear negocio</button>
        <button @click="logout" class="btn-secondary py-3 px-6 tracking-widest">Salir</button>
      </div>
    </header>

    <main class="relative z-10 animate-fade-in-up delay-100 h-full">
      <div v-if="loading" class="flex flex-col items-center justify-center py-32">
        <div class="w-12 h-12 border border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full mb-4"></div>
        <p class="text-primary tracking-widest uppercase text-xs">Cargando datos</p>
      </div>
      
      <div v-else-if="businesses.length === 0" class="flex flex-col items-center p-20 glass text-center">
        <div class="w-16 h-[1px] bg-primary/30 mb-6"></div>
        <p class="text-textMuted uppercase tracking-widest text-sm font-light">No hay negocios creados todavía.</p>
        <button @click="showAddModal = true" class="mt-8 text-primary uppercase tracking-widest text-xs border-b border-primary/30 pb-1 hover:text-white transition-colors">Añadir negocio</button>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="b in businesses" :key="b.id" class="p-8 bg-black/40 border border-white/5 hover:border-primary/30 transition-all duration-500 relative group overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors"></div>
          
          <h3 class="font-display text-2xl text-white mb-2">{{ b.name }}</h3>
          <p class="text-xs text-primary tracking-widest uppercase mb-6">ID / {{ b.slug }}</p>
          
          <div class="space-y-3 text-sm font-light">
            <div class="flex justify-between border-b border-white/5 pb-2">
              <span class="text-textMuted uppercase tracking-widest text-[10px]">Propietario</span>
              <span class="text-white">{{ b.ownerProfiles?.[0]?.user?.name || 'Desconocido' }}</span>
            </div>
            <div class="flex justify-between border-b border-white/5 pb-2">
              <span class="text-textMuted uppercase tracking-widest text-[10px]">Contacto</span>
              <span class="text-white">{{ b.ownerProfiles?.[0]?.user?.email || 'Desconocido' }}</span>
            </div>
            <div class="flex justify-between pb-2">
              <span class="text-textMuted uppercase tracking-widest text-[10px]">Intervalo de agenda</span>
              <span class="text-white">{{ b.settings?.slot_interval_minutes || 30 }}M</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Provisioning Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showAddModal = false"></div>
      <div class="w-full max-w-2xl bg-surface border border-primary/25 p-8 sm:p-12 relative z-10 shadow-2xl animate-fade-in-up">
        
        <h2 class="font-display text-3xl text-white mb-2">Alta de negocio</h2>
        <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-white/10 pb-6">Crea un nuevo negocio y su perfil propietario</p>
        
        <form @submit.prevent="handleCreateBusiness" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div class="col-span-1 md:col-span-2">
            <h3 class="text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Datos del negocio</h3>
          </div>
          
          <div>
            <input v-model="newBusiness.name" type="text" placeholder="NOMBRE DEL NEGOCIO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          <div>
            <input v-model="newBusiness.slug" type="text" placeholder="ID DE SISTEMA (SLUG)" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          <div>
            <input v-model="newBusiness.phone" type="text" placeholder="TELÉFONO DE CONTACTO" class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          <div>
            <input v-model.number="newBusiness.settings.slot_interval_minutes" type="number" placeholder="INTERVALO DE AGENDA" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          
          <div class="col-span-1 md:col-span-2 mt-4">
            <h3 class="text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Perfil del propietario</h3>
          </div>
          
          <div>
            <input v-model="newBusiness.ownerName" type="text" placeholder="NOMBRE DEL PROPIETARIO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          <div>
            <input v-model="newBusiness.ownerEmail" type="email" placeholder="CORREO DEL PROPIETARIO" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          <div class="col-span-1 md:col-span-2">
            <input v-model="newBusiness.ownerPassword" type="password" placeholder="CONTRASEÑA" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
          </div>
          
          <div class="col-span-1 md:col-span-2 flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
            <button type="button" @click="showAddModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancelar</button>
            <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]">Crear negocio</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
