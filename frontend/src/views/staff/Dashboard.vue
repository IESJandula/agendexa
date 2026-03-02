<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const staffProfile = ref<any>(null);
const activeTab = ref('appointments');
const token = localStorage.getItem('token') || '';

// Schedule related
const defaultSchedule = [
  { day_of_week: 1, name: 'Monday', active: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 2, name: 'Tuesday', active: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 3, name: 'Wednesday', active: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 4, name: 'Thursday', active: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 5, name: 'Friday', active: true, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 6, name: 'Saturday', active: false, start_time: '10:00', end_time: '14:00' },
  { day_of_week: 0, name: 'Sunday', active: false, start_time: '10:00', end_time: '14:00' }
];

const scheduleForm = ref(JSON.parse(JSON.stringify(defaultSchedule)));
const saveMsg = ref('');

onMounted(async () => {
  if (!token) {
    router.push('/staff/login');
    return;
  }
  await fetchProfile();
});

const fetchProfile = async () => {
  try {
    const res = await fetch('http://localhost:3000/staff/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      staffProfile.value = await res.json();
      
      // Populate schedule form if exists
      if (staffProfile.value.schedules && staffProfile.value.schedules.length > 0) {
        scheduleForm.value.forEach((day: any) => {
          const dbDay = staffProfile.value.schedules.find((s: any) => s.day_of_week === day.day_of_week);
          if (dbDay) {
            day.active = true;
            day.start_time = dbDay.start_time;
            day.end_time = dbDay.end_time;
          } else {
            day.active = false;
          }
        });
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/staff/login');
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
};

const saveSchedule = async () => {
  if (!staffProfile.value?.id) return;
  
  saveMsg.value = 'Saving...';
  const activeSchedules = scheduleForm.value
    .filter((day: any) => day.active)
    .map((day: any) => ({
      day_of_week: day.day_of_week,
      start_time: day.start_time,
      end_time: day.end_time
    }));

  try {
    const res = await fetch(`http://localhost:3000/staff/${staffProfile.value.id}/schedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ schedules: activeSchedules })
    });

    if (res.ok) {
      saveMsg.value = 'Schedule successfully updated!';
      setTimeout(() => saveMsg.value = '', 3000);
      await fetchProfile();
    } else {
      saveMsg.value = 'Failed to save schedule.';
    }
  } catch (error) {
    saveMsg.value = 'Error saving schedule.';
  }
};

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/staff/login');
};

const formatTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};
</script>

<template>
  <div class="min-h-screen bg-bgDark text-white font-sans flex flex-col relative overflow-hidden">
    <!-- Navbar -->
    <header class="border-b border-white/5 bg-surface/50 backdrop-blur-md relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="font-display font-semibold text-xl tracking-wide">STAFF PORTAL</h1>
          <span class="w-px h-6 bg-white/10"></span>
          <span class="text-sm text-textMuted" v-if="staffProfile">Welcome, {{ staffProfile.user.name }}</span>
        </div>
        <button @click="handleLogout" class="text-sm font-medium text-textMuted hover:text-white transition-colors">
          SIGN OUT
        </button>
      </div>
    </header>

    <main class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10" v-if="staffProfile">
      <!-- Tabs -->
      <div class="border-b border-white/10 mb-8">
        <nav class="-mb-px flex space-x-8">
          <button 
            @click="activeTab = 'appointments'"
            :class="[activeTab === 'appointments' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-white hover:border-white/30', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm tracking-wide uppercase transition-colors']"
          >
            My Appointments
          </button>
          <button 
            @click="activeTab = 'schedule'"
            :class="[activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-textMuted hover:text-white hover:border-white/30', 'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm tracking-wide uppercase transition-colors']"
          >
            Working Hours
          </button>
        </nav>
      </div>

      <!-- Tab Content: Appointments -->
      <div v-if="activeTab === 'appointments'" class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h2 class="font-display text-2xl font-semibold">Upcoming Bookings</h2>
        </div>
        
        <div v-if="!staffProfile.appointments || staffProfile.appointments.length === 0" class="text-center py-16 bg-surface/30 border border-white/5 rounded-lg backdrop-blur-sm">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 text-textMuted mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-1">No upcoming appointments</h3>
          <p class="text-sm text-textMuted">You have a clear schedule. Great time to catch up!</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="appt in staffProfile.appointments" :key="appt.id" class="p-6 bg-surface border border-white/10 rounded-lg hover:border-primary/50 transition-colors group">
            <div class="flex justify-between items-start mb-4">
              <div>
                <p class="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{{ formatDate(appt.start_datetime_utc) }}</p>
                <h3 class="font-medium text-white text-lg">{{ formatTime(appt.start_datetime_utc) }} - {{ formatTime(appt.end_datetime_utc) }}</h3>
              </div>
              <span class="px-2 py-1 text-xs font-medium bg-white/10 rounded text-textMuted border border-white/5">{{ appt.status }}</span>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded shrink-0 bg-white/5 flex items-center justify-center text-textMuted">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-white">{{ appt.client.user.name }}</p>
                  <p class="text-xs text-textMuted">{{ appt.client.user.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded shrink-0 bg-white/5 flex items-center justify-center text-textMuted">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-white">{{ appt.service.name }}</p>
                  <p class="text-xs text-textMuted">{{ appt.service.duration_min }} mins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Schedule -->
      <div v-if="activeTab === 'schedule'" class="animate-fade-in-up">
        <div class="bg-surface border border-white/5 rounded-xl shadow-2xl p-8 max-w-4xl mx-auto backdrop-blur-sm">
          <div class="mb-6">
            <h2 class="font-display text-2xl font-semibold mb-2">Weekly Availability</h2>
            <p class="text-textMuted text-sm">Define your working hours. The booking system uses this to calculate exact grid availability for your clients.</p>
          </div>

          <div class="space-y-4">
            <div v-for="day in scheduleForm" :key="day.day_of_week" class="flex items-center gap-6 p-4 rounded-lg bg-black/20 border border-white/5">
              <div class="flex items-center w-40 gap-3">
                <input type="checkbox" v-model="day.active" class="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-bgDark transition-colors" />
                <span class="text-sm font-medium" :class="day.active ? 'text-white' : 'text-textMuted'">{{ day.name }}</span>
              </div>
              
              <div class="flex-1 flex gap-4 items-center" :class="{ 'opacity-50 pointer-events-none': !day.active }">
                <div class="flex-1">
                  <label class="sr-only">Start Time</label>
                  <input type="time" v-model="day.start_time" class="block w-full rounded-md border-white/10 bg-surface px-3 py-2 text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
                <span class="text-textMuted text-sm">to</span>
                <div class="flex-1">
                  <label class="sr-only">End Time</label>
                  <input type="time" v-model="day.end_time" class="block w-full rounded-md border-white/10 bg-surface px-3 py-2 text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                </div>
              </div>
              <div class="w-24 text-right">
                <span v-if="!day.active" class="text-xs uppercase tracking-wider text-textMuted font-medium">Off</span>
                <span v-else class="text-xs uppercase tracking-wider text-primary font-medium">Active</span>
              </div>
            </div>
          </div>
          
          <div class="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <p class="text-sm" :class="saveMsg.includes('Error') || saveMsg.includes('Failed') ? 'text-accent' : 'text-primary'">{{ saveMsg }}</p>
            <button @click="saveSchedule" class="px-6 py-2.5 bg-primary text-black font-semibold uppercase tracking-widest text-sm hover:bg-white transition-colors duration-300">
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
