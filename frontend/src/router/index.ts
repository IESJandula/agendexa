import { createRouter, createWebHistory } from 'vue-router';

// Lazy loaded views
const Home = () => import('../views/Home.vue');
const SuperadminLogin = () => import('../views/superadmin/Login.vue');
const SuperadminDashboard = () => import('../views/superadmin/Dashboard.vue');
const OwnerLogin = () => import('../views/owner/Login.vue');
const OwnerDashboard = () => import('../views/owner/Dashboard.vue');
const StaffLogin = () => import('../views/staff/Login.vue');
const StaffDashboard = () => import('../views/staff/Dashboard.vue');
const BookingFlow = () => import('../views/public/BookingFlow.vue');

const routes = [
    { path: '/', component: Home },
    { path: '/superadmin/login', component: SuperadminLogin },
    { path: '/superadmin/dashboard', component: SuperadminDashboard },
    { path: '/owner/login', component: OwnerLogin },
    { path: '/owner/dashboard', component: OwnerDashboard },
    { path: '/staff/login', component: StaffLogin },
    { path: '/staff/dashboard', component: StaffDashboard },
    { path: '/book/:slug', component: BookingFlow }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
