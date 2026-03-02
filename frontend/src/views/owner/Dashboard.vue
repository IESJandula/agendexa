<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const activeTab = ref('appointments');
const services = ref<any[]>([]);
const staff = ref<any[]>([]);
const appointments = ref<any[]>([]);
const loading = ref(true);

const showServiceModal = ref(false);
const editingServiceId = ref<string | null>(null);
const newService = ref({ name: '', description: '', duration_min: 30, price: 0, staff_ids: [] as string[] });

const showStaffModal = ref(false);
const editingStaffId = ref<string | null>(null);
const newStaff = ref({ name: '', email: '', password: '', service_ids: [] as string[] });

// Booking stuff
const showBookingModal = ref(false);
const newBooking = ref({
  clientName: '',
  clientEmail: '',
  serviceId: '',
  staffId: '',
  date: '',
  time: ''
});
const availableSlots = ref<string[]>([]);

const fetchDashboardData = async () => {
  const token = localStorage.getItem('token');
  if (!token) return router.push('/owner/login');
  
  loading.value = true;
  try {
    const headers = { 'Authorization': `Bearer ${token}` };
    const today = new Date().toISOString().split('T')[0];
    
    const [appRes, srvRes, stfRes] = await Promise.all([
      fetch(`http://localhost:3000/appointments?from=${today}`, { headers }),
      fetch('http://localhost:3000/services', { headers }),
      fetch('http://localhost:3000/staff', { headers })
    ]);
    
    if (appRes.ok) appointments.value = await appRes.json();
    if (srvRes.ok) services.value = await srvRes.json();
    if (stfRes.ok) staff.value = await stfRes.json();
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const updateAppointmentStatus = async (id: string, status: string) => {
  const token = localStorage.getItem('token');
  try {
    await fetch(`http://localhost:3000/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    fetchDashboardData();
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  fetchDashboardData();
});

const openAddServiceModal = () => {
  editingServiceId.value = null;
  newService.value = { name: '', description: '', duration_min: 30, price: 0, staff_ids: [] };
  showServiceModal.value = true;
};

const openEditServiceModal = (srv: any) => {
  editingServiceId.value = srv.id;
  newService.value = { 
    name: srv.name, 
    description: srv.description || '', 
    duration_min: srv.duration_min, 
    price: srv.price, 
    staff_ids: srv.staff ? srv.staff.map((s: any) => s.staff_id) : [] 
  };
  showServiceModal.value = true;
};

const handleSaveService = async () => {
  const token = localStorage.getItem('token');
  try {
    const url = editingServiceId.value 
      ? `http://localhost:3000/services/${editingServiceId.value}` 
      : 'http://localhost:3000/services';
    const method = editingServiceId.value ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newService.value)
    });
    if (res.ok) {
      showServiceModal.value = false;
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) { console.error(err); }
};

const openAddStaffModal = () => {
  editingStaffId.value = null;
  newStaff.value = { name: '', email: '', password: '', service_ids: [] };
  showStaffModal.value = true;
};

const openEditStaffModal = (st: any) => {
  editingStaffId.value = st.id;
  newStaff.value = { 
    name: st.user.name, 
    email: st.user.email, 
    password: '', // blank on edit means don't change
    service_ids: st.services ? st.services.map((s: any) => s.service.id) : [] 
  };
  showStaffModal.value = true;
};

const handleSaveStaff = async () => {
  const token = localStorage.getItem('token');
  try {
    const isEdit = !!editingStaffId.value;
    const url = isEdit 
      ? `http://localhost:3000/staff/${editingStaffId.value}` 
      : 'http://localhost:3000/staff';
    const method = isEdit ? 'PATCH' : 'POST';

    // Only send password if editing and it's filled, or if creating
    const payload: any = { ...newStaff.value };
    if (isEdit) {
      // Typically backend staff update might not support email/password change directly on this endpoint without user logic
      // Assuming basic active status and services for now based on current backend implementation
      // We will only send service_ids for update
      payload.service_ids = newStaff.value.service_ids;
      // We don't send name/email/password because backend updateStaff only accepts is_active and service_ids.
      // Modifying User data requires specific user updates. We will focus on Services relation.
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(isEdit ? { service_ids: payload.service_ids } : payload)
    });
    if (res.ok) {
      showStaffModal.value = false;
      fetchDashboardData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) { console.error(err); }
};

const handleDateOrStaffChange = async () => {
  if (!newBooking.value.serviceId || !newBooking.value.staffId || !newBooking.value.date) {
    availableSlots.value = [];
    return;
  }
  
  // We need the business slug for the public endpoint API. Since this is the dashboard,
  // we can fetch the slug from the owner's businesses or we just use a generic 'demo-barbershop' for this MVP example.
  // Idealy, the dashboard could hit a protected `/appointments/availability` endpoint, 
  // but we can reuse the public one if we pass slug. Let's assume the user has a business with slug 'pelu' 
  // or we get it from local state.
  const slug = 'pelu'; // Hardcoded for MVP, ideally fetched from User Data
  
  try {
    const res = await fetch(`http://localhost:3000/public/${slug}/availability?serviceId=${newBooking.value.serviceId}&staffId=${newBooking.value.staffId}&date=${newBooking.value.date}`);
    if (res.ok) {
      availableSlots.value = await res.json();
    } else {
      availableSlots.value = [];
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    availableSlots.value = [];
  }
};

const openBookingModal = () => {
  newBooking.value = { clientName: '', clientEmail: '', serviceId: '', staffId: '', date: '', time: '' };
  availableSlots.value = [];
  showBookingModal.value = true;
};

const handleSaveBooking = async () => {
  try {
    const slug = 'pelu'; // Hardcoded for MVP
    const payload = {
      clientName: newBooking.value.clientName,
      clientEmail: newBooking.value.clientEmail,
      serviceId: newBooking.value.serviceId,
      staffId: newBooking.value.staffId,
      startDatetimeUtc: newBooking.value.time
    };

    const res = await fetch(`http://localhost:3000/public/${slug}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showBookingModal.value = false;
      fetchDashboardData();
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

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
</script>

<template>
  <div class="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-10 pt-8 flex flex-col md:flex-row gap-8 lg:gap-16 min-h-screen relative overflow-hidden">
    
    <!-- Ultra luxe background elements -->
    <div class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

    <!-- Sidebar / Nav -->
    <aside class="w-full md:w-72 shrink-0 flex flex-col relative z-10 animate-fade-in-up">
      <div class="mb-12">
        <h2 class="font-display font-medium text-3xl tracking-wide uppercase text-white">Agendexa Hub</h2>
        <div class="h-[1px] w-12 bg-primary mt-4"></div>
      </div>

      <nav class="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        <button 
          @click="activeTab = 'appointments'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'appointments' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white hover:border-white/20']">
          Agenda Grid
        </button>
        <button 
          @click="activeTab = 'services'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'services' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white hover:border-white/20']">
          Service Catalog
        </button>
        <button 
          @click="activeTab = 'staff'" 
          :class="['px-6 py-4 text-left border-l-2 transition-all duration-500 uppercase tracking-widest text-xs font-semibold', activeTab === 'staff' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white hover:border-white/20']">
          Personnel
        </button>
      </nav>

      <div class="mt-auto pt-16">
        <button @click="logout" class="w-full px-6 py-4 border border-white/10 hover:border-textMuted text-xs font-semibold tracking-widest uppercase text-textMuted hover:text-white transition-all">
          Disconnect
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 relative z-10">
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-50">
        <div class="w-16 h-16 border border-primary/20 flex items-center justify-center mb-4">
          <div class="w-8 h-8 border border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full"></div>
        </div>
        <p class="text-primary font-light tracking-[0.3em] text-xs uppercase animate-pulse">Synchronizing</p>
      </div>

      <!-- Agenda View -->
      <div v-show="activeTab === 'appointments'" class="animate-fade-in-up delay-100 h-full flex flex-col">
        <header class="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Today's Dispatch</h3>
            <p class="text-textMuted text-xs uppercase tracking-widest mt-2 font-light">Real-time schedule monitoring</p>
          </div>
          <button @click="openBookingModal" class="btn-primary px-6 py-2 tracking-widest text-[10px] uppercase">+ New Dispatch</button>
        </header>
        
        <div v-if="appointments.length === 0" class="flex-1 flex flex-col items-center justify-center py-32 border border-white/5 bg-black/20">
          <div class="w-16 h-[1px] bg-primary/30 mb-6"></div>
          <p class="text-textMuted font-light uppercase tracking-widest text-sm text-center text-balance">The grid is empty.<br/>No reservations for today.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="app in appointments" :key="app.id" class="p-6 bg-black/40 border border-white/5 hover:border-primary/30 hover:bg-black/60 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="flex gap-6 items-center">
              <div class="text-center shrink-0 w-24">
                <span class="block text-primary font-display font-medium text-xl">{{ formatTime(app.start_datetime_utc) }}</span>
                <span class="block text-xs text-textMuted uppercase tracking-widest mt-1">{{ formatDate(app.start_datetime_utc) }}</span>
              </div>
              
              <div class="w-px h-12 bg-white/10 hidden md:block"></div>

              <div>
                <h4 class="font-display text-lg text-white mb-1">{{ app.service.name }}</h4>
                <p class="text-xs text-textMuted uppercase tracking-widest font-light">P: {{ app.staff.user.name }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-6">
              <span :class="['text-xs uppercase tracking-[0.2em] font-medium border-b pb-1', 
                app.status === 'CONFIRMED' ? 'text-primary border-primary/30' : 
                app.status === 'COMPLETED' ? 'text-neutral-500 border-neutral-700' : 'text-red-500/70 border-red-900/50']">
                {{ app.status }}
              </span>
              
              <div v-if="app.status === 'CONFIRMED'" class="flex gap-3">
                <button @click="updateAppointmentStatus(app.id, 'COMPLETED')" class="w-10 h-10 border border-white/10 hover:border-primary text-textMuted hover:text-primary flex items-center justify-center transition-all bg-black/50 tooltip" title="Mark Complete">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M5 13l4 4L19 7" /></svg>
                </button>
                <button @click="updateAppointmentStatus(app.id, 'CANCELLED')" class="w-10 h-10 border border-white/10 hover:border-red-500/50 text-textMuted hover:text-red-400 flex items-center justify-center transition-all bg-black/50 tooltip" title="Cancel">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Services View -->
      <div v-show="activeTab === 'services'" class="animate-fade-in-up delay-100">
        <header class="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Service Portfolio</h3>
          </div>
          <button v-if="services.length > 0" @click="openAddServiceModal" class="text-primary text-xs tracking-widest uppercase border-b border-primary/30 pb-1 hover:text-white transition-colors">+ Add Service</button>
        </header>
        <div v-if="services.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 border border-white/5 bg-black/20 text-center animate-fade-in-up">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 4v16m8-8H4" /></svg>
          </div>
          <h4 class="font-display text-xl text-white mb-2">First Step to Success</h4>
          <p class="text-textMuted font-light text-sm max-w-md mb-8 leading-relaxed">Let clients know what you offer. Add your first service to Agendexa so we can populate your booking grid.</p>
          <button @click="openAddServiceModal" class="btn-primary text-xs tracking-widest px-8">Create First Service</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="srv in services" :key="srv.id" @click="openEditServiceModal(srv)" class="cursor-pointer p-6 bg-black/40 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-colors">
            <h4 class="font-display text-xl text-white mb-4">{{ srv.name }}</h4>
            <div class="flex items-center gap-6">
              <span class="text-xs uppercase tracking-widest text-textMuted font-light">{{ srv.duration_min }} MINS</span>
              <span class="text-lg font-light text-primary">${{ srv.price }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Staff View -->
      <div v-show="activeTab === 'staff'" class="animate-fade-in-up delay-100">
        <header class="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
          <div>
            <h3 class="font-display text-2xl text-white">Operatives</h3>
          </div>
          <button v-if="staff.length > 0" @click="openAddStaffModal" class="text-primary text-xs tracking-widest uppercase border-b border-primary/30 pb-1 hover:text-white transition-colors">+ Add Operative</button>
        </header>
        <div v-if="staff.length === 0" class="flex-1 flex flex-col items-center justify-center p-12 border border-white/5 bg-black/20 text-center animate-fade-in-up">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h4 class="font-display text-xl text-white mb-2">Build Your Team</h4>
          <p class="text-textMuted font-light text-sm max-w-md mb-8 leading-relaxed">Agendexa needs operatives to perform services. Add your first team member and define their availability.</p>
          <button @click="openAddStaffModal" class="btn-primary text-xs tracking-widest px-8">Add Team Member</button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="st in staff" :key="st.id" @click="openEditStaffModal(st)" class="cursor-pointer p-6 bg-black/40 border border-white/5 flex items-center gap-6 group hover:border-white/20 transition-colors">
            <div class="w-14 h-14 bg-gradient-to-tr from-surface to-[#1f1f1f] border border-white/10 flex items-center justify-center font-display text-xl text-white">
              {{ st.user.name.charAt(0) }}
            </div>
            <div>
              <h4 class="font-display text-lg text-white mb-1">{{ st.user.name }}</h4>
              <p class="text-xs text-textMuted uppercase tracking-widest mb-2 font-light">{{ st.user.email }}</p>
              <span :class="['text-[10px] px-2 py-1 uppercase tracking-widest', st.is_active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-textMuted border border-white/10']">
                 {{ st.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Service Modal -->
      <div v-if="showServiceModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showServiceModal = false"></div>
        <div class="w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 relative z-10 shadow-2xl animate-fade-in-up">
          <h2 class="font-display text-3xl text-white mb-2">{{ editingServiceId ? 'Edit Service' : 'New Service' }}</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-white/10 pb-6">Expand your portfolio offering</p>
          <form @submit.prevent="handleSaveService" class="space-y-6">
            <input v-model="newService.name" type="text" placeholder="SERVICE NAME" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            <input v-model="newService.description" type="text" placeholder="DESCRIPTION (OPTIONAL)" class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            <div class="grid grid-cols-2 gap-4">
              <input v-model.number="newService.duration_min" type="number" placeholder="DURATION (MINS)" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
              <input v-model.number="newService.price" type="number" placeholder="PRICE ($)" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            </div>

            <!-- Assigned Staff Checkboxes -->
            <div class="pt-4 border-t border-white/5">
              <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Assigned Operativos</label>
              <div v-if="staff.length === 0" class="text-textMuted text-xs font-light">
                No staff members available yet.
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                <label v-for="st in staff" :key="st.id" class="flex items-center gap-3 p-3 bg-black/30 border border-white/5 hover:border-primary/30 cursor-pointer transition-colors group">
                  <input type="checkbox" v-model="newService.staff_ids" :value="st.id" class="accent-primary w-4 h-4" />
                  <div class="flex flex-col">
                    <span class="text-xs text-white group-hover:text-primary transition-colors">{{ st.user.name }}</span>
                    <span class="text-[10px] text-textMuted uppercase tracking-widest">{{ st.user.email }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
              <button type="button" @click="showServiceModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancel</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]">{{ editingServiceId ? 'Save Changes' : 'Create Service' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create/Edit Staff Modal -->
      <div v-if="showStaffModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showStaffModal = false"></div>
        <div class="w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 relative z-10 shadow-2xl animate-fade-in-up">
          <h2 class="font-display text-3xl text-white mb-2">{{ editingStaffId ? 'Edit Operative' : 'New Operative' }}</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-white/10 pb-6">Procurer of excellence</p>
          <form @submit.prevent="handleSaveStaff" class="space-y-6">
            <input v-if="!editingStaffId" v-model="newStaff.name" type="text" placeholder="FULL NAME" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            <input v-if="!editingStaffId" v-model="newStaff.email" type="email" placeholder="LOGIN EMAIL" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            <input v-if="!editingStaffId" v-model="newStaff.password" type="password" placeholder="INITIAL PASSWORD" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            
            <div class="pt-4 border-t border-white/5">
              <label class="block text-primary uppercase tracking-widest text-[10px] mb-4 font-semibold">Assigned Services</label>
              <div v-if="services.length === 0" class="text-textMuted text-xs font-light">
                No services available yet. Please create a service first in the catalog.
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                <label v-for="srv in services" :key="srv.id" class="flex items-center gap-3 p-3 bg-black/30 border border-white/5 hover:border-primary/30 cursor-pointer transition-colors group">
                  <input type="checkbox" v-model="newStaff.service_ids" :value="srv.id" class="accent-primary w-4 h-4" />
                  <div class="flex flex-col">
                    <span class="text-xs text-white group-hover:text-primary transition-colors">{{ srv.name }}</span>
                    <span class="text-[10px] text-textMuted uppercase tracking-widest">{{ srv.duration_min }} MIN</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
              <button type="button" @click="showStaffModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancel</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]">{{ editingStaffId ? 'Save Changes' : 'Register Operative' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create Booking Modal (Internal) -->
      <div v-if="showBookingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="showBookingModal = false"></div>
        <div class="w-full max-w-lg bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 relative z-10 shadow-2xl animate-fade-in-up">
          <h2 class="font-display text-3xl text-white mb-2">Internal Dispatch</h2>
          <p class="text-textMuted uppercase tracking-widest text-xs font-light mb-8 border-b border-white/10 pb-6">Manually assign a client to the grid</p>
          
          <form @submit.prevent="handleSaveBooking" class="space-y-6">
            <input v-model="newBooking.clientName" type="text" placeholder="CLIENT NAME" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            <input v-model="newBooking.clientEmail" type="email" placeholder="CLIENT EMAIL" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest" />
            
            <div class="grid grid-cols-2 gap-4">
              <select v-model="newBooking.serviceId" @change="handleDateOrStaffChange" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest text-white">
                <option value="" disabled selected>SERVICE</option>
                <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <select v-model="newBooking.staffId" @change="handleDateOrStaffChange" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest text-white">
                <option value="" disabled selected>OPERATIVE</option>
                <option v-for="st in staff" :key="st.id" :value="st.id">{{ st.user.name }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <input v-model="newBooking.date" @change="handleDateOrStaffChange" type="date" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest text-white" />
              <select v-model="newBooking.time" required class="input-premium bg-black/50 border-white/5 hover:border-primary/50 text-xs tracking-widest text-white" :disabled="availableSlots.length === 0">
                <option value="" disabled selected>TIME SLOT</option>
                <option v-for="slot in availableSlots" :key="slot" :value="slot">
                  {{ formatTime(slot) }}
                </option>
              </select>
            </div>
            
            <div v-if="newBooking.date && availableSlots.length === 0" class="text-red-500/70 text-[10px] uppercase tracking-widest mt-2 border border-red-900/50 p-2 bg-red-900/10">
              No slots available for this configuration.
            </div>

            <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
              <button type="button" @click="showBookingModal = false" class="btn-secondary px-8 py-3 tracking-widest text-[10px]">Cancel</button>
              <button type="submit" class="btn-primary px-8 py-3 tracking-widest text-[10px]" :disabled="!newBooking.time">Lock Slot</button>
            </div>
          </form>
        </div>
      </div>

    </main>

  </div>
</template>
