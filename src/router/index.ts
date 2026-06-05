import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/DashboardView.vue'

const router = createRouter({
  // Menggunakan history mode agar URL terlihat bersih (tanpa tanda #)
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // {
    //   path: '/about',
    //   name: 'about',
    //   // Lazy-loading: Halaman ini hanya dimuat saat diakses pengguna (menghemat performa)
    //   component: () => import('../views/AboutView.vue')
    // }
  ]
})

export default router