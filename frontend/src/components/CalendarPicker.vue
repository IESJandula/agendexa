<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  availabilityMap: Record<string, boolean>;
  selectedDate: string;
}>();

const emit = defineEmits<{
  (e: 'select', date: string): void;
  (e: 'month-change', year: number, month: number): void;
}>();

const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth()); // 0-indexed

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const dayNames = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

const currentMonthName = computed(() => monthNames[currentMonth.value]);

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate();
});

const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay();
});

const calendarDays = computed(() => {
  const days = [];
  // Paddin for previous month
  for (let i = 0; i < firstDayOfMonth.value; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth.value; i++) {
    const padMonth = String(currentMonth.value + 1).padStart(2, '0');
    const padDay = String(i).padStart(2, '0');
    const isoDate = `${currentYear.value}-${padMonth}-${padDay}`;
    
    // Check if it's past
    const isPast = new Date(isoDate).getTime() + 86400000 < today.getTime();
    const isAvailable = props.availabilityMap[isoDate] === true;
    
    days.push({
      day: i,
      isoDate,
      isAvailable: isAvailable && !isPast,
      isPast
    });
  }
  return days;
});

const changeMonth = (offset: number) => {
  let newMonth = currentMonth.value + offset;
  let newYear = currentYear.value;
  
  if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  } else if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  }
  
  // Don't go back further than current month
  if (newYear < today.getFullYear() || (newYear === today.getFullYear() && newMonth < today.getMonth())) {
    return;
  }

  currentMonth.value = newMonth;
  currentYear.value = newYear;

  emit('month-change', newYear, newMonth + 1);
};

const selectDate = (day: any) => {
  if (day && day.isAvailable) {
    emit('select', day.isoDate);
  }
};
</script>

<template>
  <div class="w-full bg-black/40 border border-white/5 relative overflow-hidden group">
    <!-- Luxe background effects -->
    <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>

    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-white/5">
      <button type="button" @click="changeMonth(-1)" class="p-2 text-textMuted hover:text-white transition-colors" :class="{'opacity-50 cursor-not-allowed': currentYear === today.getFullYear() && currentMonth === today.getMonth()}">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M15 19l-7-7 7-7" /></svg>
      </button>
      
      <div class="font-display font-medium text-lg uppercase tracking-widest text-white">
        {{ currentMonthName }} <span class="text-primary font-light">{{ currentYear }}</span>
      </div>

      <button type="button" @click="changeMonth(1)" class="p-2 text-textMuted hover:text-white transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>

    <!-- Days Header -->
    <div class="grid grid-cols-7 gap-1 p-4 pb-2">
      <div v-for="dName in dayNames" :key="dName" class="text-center text-[10px] tracking-widest uppercase text-textMuted font-medium">
        {{ dName }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-2 px-4 pb-6">
      <div v-for="(day, index) in calendarDays" :key="index" class="relative group/day">
        <button 
          v-if="day"
          type="button"
          @click="selectDate(day)"
          :disabled="!day.isAvailable"
          :class="[
            'w-full aspect-square flex items-center justify-center text-sm transition-all duration-300 relative border z-10',
            day.isoDate === selectedDate 
              ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(229,192,123,0.3)] font-medium' 
              : day.isAvailable 
                ? 'bg-primary/5 text-white border-primary/20 hover:bg-primary/20 hover:border-primary/40 cursor-pointer' 
                : day.isPast
                  ? 'bg-transparent text-white/10 border-transparent cursor-not-allowed'
                  : 'bg-red-500/5 text-textMuted border-red-500/10 cursor-not-allowed hidden-diagonal'
          ]"
        >
          <!-- Red cross diagonal for unavailable future days -->
          <div v-if="!day.isAvailable && !day.isPast" class="absolute inset-0 pointer-events-none opacity-20">
             <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" class="text-red-500" stroke-width="1" />
             </svg>
          </div>
          {{ day.day }}
        </button>
        <div v-else class="w-full aspect-square text-transparent"></div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Additional specific styles if needed */
</style>
