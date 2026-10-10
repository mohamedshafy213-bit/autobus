import { createRouter, createWebHashHistory } from 'vue-router';
import CheckInView from '../views/CheckInView.vue';
import BusesView from '../views/BusesView.vue';
import StudentsView from '../views/StudentsView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/checkin'
    },
    {
      path: '/checkin',
      name: 'checkin',
      component: CheckInView,
      meta: { title: 'تسجيل الحضور' }
    },
    {
      path: '/students',
      name: 'students',
      component: StudentsView,
      meta: { title: 'الطلاب' }
    },
    {
      path: '/data',
      redirect: '/students'
    },
    {
      path: '/buses',
      name: 'buses',
      component: BusesView,
      meta: { title: 'الأتوبيسات' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { title: 'الإعدادات' }
    }
  ]
});

router.afterEach((to) => {
  document.title = (to.meta.title ? `${to.meta.title} - ` : '') + 'منظومة الأتوبيسات';
});

export default router;
