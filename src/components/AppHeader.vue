<template>
  <header class="no-print bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        
        <!-- App Logo & Title -->
        <div class="flex items-center space-x-3 space-x-reverse">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
            <i class="pi pi-car text-xl"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg sm:text-xl font-bold font-cairo tracking-wide text-white">
                منظومة الأتوبيسات
              </h1>
              <span class="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                حفل التخرج
              </span>
            </div>
            <p class="text-xs text-slate-400 hidden sm:block">إدارة وتنظيم مقاعد الأتوبيسات — شبكة LAN</p>
          </div>
        </div>

        <!-- Navigation Tabs: تسجيل الحضور | الطلاب | الأتوبيسات | الإعدادات -->
        <nav class="flex items-center gap-1 sm:gap-2">
          <!-- 1) Check-in -->
          <router-link
            to="/checkin"
            v-slot="{ isActive, href, navigate }"
            custom
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <i class="pi pi-check-circle text-base"></i>
              <span>تسجيل الحضور</span>
              <span 
                v-if="stats.arrivedStudents > 0" 
                class="ms-1 px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-200 text-[10px]"
              >
                {{ stats.arrivedStudents }}
              </span>
            </a>
          </router-link>

          <!-- 2) Students -->
          <router-link
            to="/students"
            v-slot="{ isActive, href, navigate }"
            custom
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <i class="pi pi-users text-base"></i>
              <span>الطلاب</span>
              <span class="ms-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                {{ stats.totalStudents }}
              </span>
            </a>
          </router-link>

          <!-- 3) Buses -->
          <router-link
            to="/buses"
            v-slot="{ isActive, href, navigate }"
            custom
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <i class="pi pi-truck text-base"></i>
              <span>الأتوبيسات</span>
              <span class="ms-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                {{ store.settings.busCount }}
              </span>
            </a>
          </router-link>

          <!-- 4) Settings -->
          <router-link
            to="/settings"
            v-slot="{ isActive, href, navigate }"
            custom
          >
            <a
              :href="href"
              @click="navigate"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ]"
            >
              <i class="pi pi-cog text-base"></i>
              <span>الإعدادات</span>
            </a>
          </router-link>
        </nav>

        <!-- Live Header Info & Server Connection Status -->
        <div class="hidden lg:flex items-center gap-3">
          
          <!-- Device Distinction Badge (Server vs Client) -->
          <div
            v-if="store.deviceInfo"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all"
            :class="store.deviceInfo.isServerDevice
              ? 'bg-purple-950/90 text-purple-200 border border-purple-500/40 ring-1 ring-purple-500/20'
              : 'bg-cyan-950/90 text-cyan-200 border border-cyan-500/40 ring-1 ring-cyan-500/20'"
            :title="store.deviceInfo.isServerDevice ? 'هذا الجهاز هو السيرفر الرئيسي المستضيف للبيانات' : 'هذا الجهاز عميل متصل بالسيرفر عبر كابل الشبكة'"
          >
            <i :class="store.deviceInfo.isServerDevice ? 'pi pi-server text-purple-400' : 'pi pi-desktop text-cyan-400'"></i>
            <span>{{ store.deviceInfo.isServerDevice ? 'السيرفر الرئيسي' : 'جهاز عميل (Client)' }}</span>
            <span class="font-mono text-[11px] opacity-80 ms-1 px-1.5 py-0.2 rounded bg-black/30">
              {{ store.deviceInfo.isServerDevice ? 'SERVER' : (store.deviceInfo.clientIp || 'جهاز عميل') }}
            </span>
          </div>

          <!-- Live Quick Numbers -->
          <div class="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <div>
              <span class="text-slate-400">حضر: </span>
              <span class="font-bold text-emerald-400">{{ stats.arrivedPersons }} فرد</span>
            </div>
            <span class="text-slate-600">|</span>
            <div>
              <span class="text-slate-400">متبقي: </span>
              <span class="font-bold text-amber-400">{{ stats.remainingPersons }} فرد</span>
            </div>
          </div>

          <!-- Connection status indicator -->
          <div class="flex items-center gap-1.5 text-xs">
            <span 
              class="w-2.5 h-2.5 rounded-full" 
              :class="store.isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-red-500 animate-pulse'"
            ></span>
            <span :class="store.isOnline ? 'text-slate-300' : 'text-red-400 font-bold'">
              {{ store.isOnline ? 'متصل بالسيرفر' : 'انقطع الاتصال ❌' }}
            </span>
          </div>
        </div>

      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';

const store = useBusesStore();
const stats = computed(() => store.stats);
</script>
