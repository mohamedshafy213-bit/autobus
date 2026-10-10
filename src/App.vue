<template>
  <div class="min-h-screen bg-slate-100 flex flex-col font-cairo" dir="rtl">
    
    <!-- Red Banner when Server Connection is Lost -->
    <div
      v-if="!store.isOnline"
      class="no-print bg-red-600 text-white text-center py-3 px-4 font-black flex items-center justify-center gap-2.5 shadow-lg sticky top-0 z-50 text-sm animate-pulse"
    >
      <i class="pi pi-exclamation-triangle text-xl"></i>
      <span>انقطع الاتصال بالسيرفر — تم إيقاف إجراءات التعديل والتسكين مؤقتاً حتى عودة الاتصال</span>
    </div>

    <!-- Global PrimeVue Toast (bottom-left) -->
    <Toast position="bottom-left" class="font-cairo text-sm" />

    <!-- Global Confirmation Dialog -->
    <ConfirmDialog class="font-cairo" />

    <!-- Top Navigation Header -->
    <AppHeader class="no-print" />

    <!-- Main View -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
      <router-view @trigger-print="handleTriggerPrint" />
    </main>

    <!-- Footer -->
    <footer class="no-print bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
      منظومة الأتوبيسات لحفل التخرج — شبكة LAN مشتركة
    </footer>

    <!-- Print Template (visible only during window.print()) -->
    <PrintTemplate
      :targetBusNumber="printState.targetBusNumber"
      :staff="printState.staff"
    />

  </div>
</template>

<script setup>
import { reactive, onMounted, nextTick } from 'vue';
import { useBusesStore } from './stores/busesStore.js';
import AppHeader from './components/AppHeader.vue';
import PrintTemplate from './components/PrintTemplate.vue';

const store = useBusesStore();

const printState = reactive({
  targetBusNumber: null,
  staff: {
    manager: '',
    driver: '',
    security: ''
  }
});

onMounted(() => {
  store.init();
});

async function handleTriggerPrint(printConfig) {
  printState.targetBusNumber = printConfig.busNumber;
  printState.staff = { ...printConfig.staff };

  await nextTick();
  window.print();
}
</script>
