<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';

import CalendarPicker from '../../components/CalendarPicker.vue';

// Simulated Analytics Hook
const trackEvent = (eventName: string, properties: any = {}) => {
  console.log(`[Analytics] ${eventName}`, properties);
  // Example: if (window.dataLayer) dataLayer.push({ event: eventName, ...properties });
};

const route = useRoute();
const slug = route.params.slug as string;

const step = ref(1); // 1: Service, 2: Staff, 3: Date/Time, 4: Details, 5: Confirmation

watch(step, (newStep) => {
  const stepNames = ['Selección de servicio', 'Selección de profesional', 'Disponibilidad', 'Datos del cliente', 'Confirmado'];
  trackEvent('view_booking_step', { step: newStep, step_name: stepNames[newStep - 1] });
});
const services = ref<any[]>([]);
const staff = ref<any[]>([]);
const availableSlots = ref<string[]>([]);
const targetDate = ref<string>(''); // No default date selected initially
const monthlyAvailability = ref<Record<string, boolean>>({});

const booking = ref({
  serviceId: '',
  staffId: '',
  startDatetimeUtc: '',
  clientName: '',
  clientEmail: '',
  clientPhone: ''
});

onMounted(async () => {
  try {
    const res = await fetch(`http://localhost:3000/public/${slug}/services`);
    if (res.ok) services.value = await res.json();
  } catch (error) {
    console.error(error);
  }
});

const selectService = async (id: string, name: string, price: number) => {
  booking.value.serviceId = id;
  trackEvent('select_service', { service_id: id, service_name: name, price });
  try {
    const res = await fetch(`http://localhost:3000/public/${slug}/staff?serviceId=${id}`);
    if (res.ok) staff.value = await res.json();
    step.value = 2;
  } catch (error) {
    console.error(error);
  }
};

const selectStaff = async (id: string, name: string) => {
  booking.value.staffId = id;
  trackEvent('select_staff', { staff_id: id, staff_name: name });
  step.value = 3;
  targetDate.value = ''; // Reset selected date
  availableSlots.value = []; // Reset slots
  
  const today = new Date();
  await fetchMonthlyAvailability(today.getFullYear(), today.getMonth() + 1);
};

const fetchMonthlyAvailability = async (year: number, month: number) => {
  if (!booking.value.serviceId || !booking.value.staffId) return;
  try {
    const res = await fetch(`http://localhost:3000/public/${slug}/availability/month?serviceId=${booking.value.serviceId}&staffId=${booking.value.staffId}&year=${year}&month=${month}`);
    if (res.ok) {
      monthlyAvailability.value = await res.json();
    } else {
      monthlyAvailability.value = {};
    }
  } catch (err) {
    console.error(err);
  }
};

const fetchAvailability = async () => {
  if (!booking.value.serviceId || !booking.value.staffId || !targetDate.value) return;
  try {
    const res = await fetch(`http://localhost:3000/public/${slug}/availability?serviceId=${booking.value.serviceId}&staffId=${booking.value.staffId}&date=${targetDate.value}`);
    if (res.ok) availableSlots.value = await res.json();
    else availableSlots.value = [];
  } catch (error) {
    console.error(error);
  }
};

const selectSlot = (slotUtc: string) => {
  booking.value.startDatetimeUtc = slotUtc;
  trackEvent('select_timeslot', { datetime_utc: slotUtc });
  step.value = 4;
};

const handleMonthChange = (year: number, month: number) => {
  fetchMonthlyAvailability(year, month);
};

const handleDateSelect = async (dateStr: string) => {
  targetDate.value = dateStr;
  await fetchAvailability();
};

const submitBooking = async () => {
  try {
    trackEvent('attempt_booking', { service_id: booking.value.serviceId });
    const res = await fetch(`http://localhost:3000/public/${slug}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking.value)
    });
    if (res.ok) {
      trackEvent('booking_confirmed', { ...booking.value });
      step.value = 5;
    } else {
      const data = await res.json();
      trackEvent('booking_failed', { error: data.error });
      alert(data.error || 'No se pudo reservar la cita');
    }
  } catch (error) {
    console.error(error);
  }
};

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' });

const selectedServiceName = computed(() => services.value.find(s => s.id === booking.value.serviceId)?.name || '');
const selectedStaffName = computed(() => staff.value.find(s => s.id === booking.value.staffId)?.user.name || '');
</script>

<template>
  <div class="flex-1 w-full flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-screen">
    
    <!-- Ultra luxe background elements -->
    <div class="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>
    <div class="absolute top-0 right-0 w-[500px] h-[800px] bg-gradient-to-bl from-primary/10 to-transparent blur-[100px] pointer-events-none"></div>

    <div class="w-full max-w-xl glass p-8 sm:p-12 relative z-10 flex flex-col min-h-[600px] transition-all duration-700 animate-fade-in-up border-t border-t-white/10 border-l border-l-white/5">
      
      <!-- Stepper Header -->
      <div class="mb-12 text-center relative">
        <button v-if="step > 1 && step < 5" @click="step--" class="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-textMuted hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <h2 class="font-display font-medium text-2xl tracking-wide uppercase text-white mb-6">
          <span v-if="step === 1">Selecciona servicio</span>
          <span v-else-if="step === 2">Selecciona profesional</span>
          <span v-else-if="step === 3">Disponibilidad</span>
          <span v-else-if="step === 4">Tus datos</span>
          <span v-else-if="step === 5" class="text-primary">Confirmado</span>
        </h2>
        
        <div class="flex justify-center gap-1.5">
          <div v-for="i in 4" :key="i" :class="['h-[2px] transition-all duration-700 w-12', i === step ? 'bg-primary shadow-[0_0_10px_rgba(57,203,105,0.45)]' : i < step ? 'bg-primary/40' : 'bg-white/10']"></div>
        </div>
      </div>

      <!-- Step 1: Services -->
      <transition name="fade" mode="out-in">
        <div v-if="step === 1" class="flex-1 flex flex-col gap-4">
          <div v-if="services.length === 0" class="text-center font-light uppercase tracking-widest text-textMuted py-20 animate-pulse">Cargando catálogo...</div>
          <button v-for="s in services" :key="s.id" @click="selectService(s.id, s.name, s.price)" class="w-full p-6 bg-black/40 border-b border-white/5 hover:bg-black/60 hover:pl-8 transition-all duration-300 text-left flex justify-between items-center group cursor-pointer relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="relative z-10">
              <h3 class="font-display text-lg mb-1 tracking-wide">{{ s.name }}</h3>
              <p class="text-xs text-textMuted uppercase tracking-widest font-light">{{ s.duration_min }} MIN</p>
            </div>
            <div class="relative z-10 text-primary font-light text-lg tracking-wider">${{ s.price }}</div>
          </button>
        </div>

        <!-- Step 2: Staff -->
        <div v-else-if="step === 2" class="flex-1 flex flex-col gap-4">
          <button v-for="st in staff" :key="st.id" @click="selectStaff(st.id, st.user.name)" class="w-full p-6 bg-black/40 border border-transparent hover:border-primary/20 transition-all duration-500 text-left flex items-center gap-6 group cursor-pointer relative">
            <div class="w-16 h-16 bg-gradient-to-tr from-surface to-border flex items-center justify-center font-display text-2xl text-white group-hover:text-primary transition-colors border border-white/5 shadow-2xl">
              {{ st.user.name.charAt(0) }}
            </div>
            <div>
              <h3 class="font-display text-xl mb-1 group-hover:tracking-wider transition-all duration-500">{{ st.user.name }}</h3>
              <p class="text-xs text-primary uppercase tracking-[0.2em]">Especialista</p>
            </div>
          </button>
        </div>

        <!-- Step 3: Date & Time -->
        <div v-else-if="step === 3" class="flex-1 flex flex-col h-full gap-8">
          
          <CalendarPicker 
            :availabilityMap="monthlyAvailability"
            :selectedDate="targetDate"
            @month-change="handleMonthChange"
            @select="handleDateSelect"
          />

          <div v-if="targetDate" class="animate-fade-in-up">
            <h3 class="font-display text-lg text-white mb-4 text-center border-b border-white/10 pb-2">Horarios disponibles para {{ formatDate(targetDate) }}</h3>
            <div v-if="availableSlots.length === 0" class="flex-1 flex flex-col items-center justify-center text-textMuted py-8">
              <div class="w-12 h-[1px] bg-primary/30 mb-6"></div>
              <p class="font-light tracking-widest text-sm uppercase">Sin disponibilidad</p>
            </div>

            <div v-else class="grid grid-cols-3 gap-3 overflow-y-auto pr-2 pb-4 max-h-48 custom-scrollbar">
              <button v-for="slot in availableSlots" :key="slot" @click="selectSlot(slot)" class="py-3 text-center border border-white/5 bg-black/20 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 text-sm font-light tracking-widest">
                {{ formatTime(slot) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Step 4: Details -->
        <div v-else-if="step === 4" class="flex-1 flex flex-col justify-between">
          <div class="mb-8 p-6 bg-black/50 border border-white/5 relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div class="flex flex-col gap-3">
              <div class="flex justify-between items-center text-sm font-light">
                <span class="text-textMuted uppercase tracking-widest text-xs">Servicio</span>
                <span class="text-white">{{ selectedServiceName }}</span>
              </div>
              <div class="flex justify-between items-center text-sm font-light">
                <span class="text-textMuted uppercase tracking-widest text-xs">Profesional</span>
                <span class="text-white">{{ selectedStaffName }}</span>
              </div>
              <div class="flex justify-between items-center text-sm font-light">
                <span class="text-textMuted uppercase tracking-widest text-xs">Hora</span>
                <span class="text-primary">{{ formatTime(booking.startDatetimeUtc) }}</span>
              </div>
            </div>
          </div>

          <form @submit.prevent="submitBooking" class="space-y-8 mt-4">
            <div class="relative">
              <input id="clientName" v-model="booking.clientName" type="text" required class="peer w-full bg-transparent border-b border-white/20 px-0 py-2 text-white placeholder-transparent focus:outline-none focus:border-primary transition-colors" placeholder="Nombre completo" />
              <label for="clientName" class="absolute left-0 -top-3.5 text-xs text-textMuted transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary uppercase tracking-widest">Nombre completo</label>
            </div>
            <div class="relative">
              <input id="clientEmail" v-model="booking.clientEmail" type="email" required class="peer w-full bg-transparent border-b border-white/20 px-0 py-2 text-white placeholder-transparent focus:outline-none focus:border-primary transition-colors" placeholder="Correo de contacto" />
              <label for="clientEmail" class="absolute left-0 -top-3.5 text-xs text-textMuted transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary uppercase tracking-widest">Correo de contacto</label>
            </div>
            <div class="relative">
              <input id="clientPhone" v-model="booking.clientPhone" type="tel" class="peer w-full bg-transparent border-b border-white/20 px-0 py-2 text-white placeholder-transparent focus:outline-none focus:border-primary transition-colors" placeholder="Teléfono (opcional)" />
              <label for="clientPhone" class="absolute left-0 -top-3.5 text-xs text-textMuted transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary uppercase tracking-widest">Teléfono (opcional)</label>
            </div>
          </form>

          <div class="mt-12 flex flex-col gap-3">
            <button @click="submitBooking" class="btn-primary w-full py-5 text-sm tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              Finalizar reserva
            </button>
            <p class="text-center text-[10px] text-textMuted uppercase tracking-widest font-light flex items-center justify-center gap-2">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              No se requiere tarjeta. Rápido y seguro.
            </p>
          </div>
        </div>

        <!-- Step 5: Success -->
        <div v-else-if="step === 5" class="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div class="w-32 h-32 rounded-full border border-primary/30 flex items-center justify-center mb-8 relative">
            <div class="absolute inset-0 rounded-full border border-primary animate-ping opacity-20"></div>
            <div class="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-black">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          
          <h2 class="font-display text-4xl mb-4 text-white">Reserva confirmada</h2>
          <p class="text-textMuted font-light max-w-sm mb-6 leading-relaxed">Tu reserva se ha completado. Revisa tu bandeja de entrada para ver el correo de confirmación.</p>
          <p class="text-sm tracking-widest text-primary border-t border-b border-primary/20 py-3 w-full">{{ formatTime(booking.startDatetimeUtc) }} // {{ formatDate(booking.startDatetimeUtc) }}</p>
          
          <button @click="step = 1; targetDate = new Date().toISOString().split('T')[0] || ''" class="mt-16 text-xs uppercase tracking-widest text-textMuted hover:text-white transition-colors border-b border-white/30 pb-1">
            Iniciar nueva reserva
          </button>
        </div>
      </transition>

    </div>
  </div>
</template>
