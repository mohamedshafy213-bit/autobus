<template>
  <Dialog
    v-model:visible="visible"
    modal
    :closable="true"
    :dismissableMask="true"
    :header="false"
    :style="{ width: '480px', maxWidth: '95vw' }"
    class="checkin-success-dialog rounded-3xl overflow-hidden shadow-2xl"
    @hide="onClose"
  >
    <div v-if="checkInData" class="p-6 text-center space-y-6">
      
      <!-- Top Success Icon & Badge -->
      <div class="flex justify-center">
        <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-inner animate-bounce">
          <i class="pi pi-check font-black"></i>
        </div>
      </div>

      <!-- Title -->
      <div>
        <span class="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-1 border border-emerald-200">
          تم تسجيل الحضور بنجاح
        </span>
        <h3 class="text-2xl font-black text-slate-800">
          {{ checkInData.student?.name }}
        </h3>
        <p class="text-sm text-slate-500 font-semibold mt-0.5">
          رقم الطالب: <span class="text-slate-800 font-mono">{{ checkInData.student?.number }}</span>
        </p>
      </div>

      <!-- BIG BUS NUMBER BOX -->
      <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/25 transform transition hover:scale-[1.02]">
        <span class="text-sm font-bold tracking-wider text-emerald-100 uppercase">
          يرجى التوجه إلى
        </span>
        <div class="flex items-center justify-center gap-3 my-2">
          <i class="pi pi-truck text-4xl text-emerald-200"></i>
          <span class="text-6xl sm:text-7xl font-black tracking-tight font-mono">
            {{ checkInData.busNumber }}
          </span>
        </div>
        <div class="text-lg font-bold text-emerald-100">
          أتوبيس رقم ({{ checkInData.busNumber }})
        </div>
      </div>

      <!-- Passenger & Family Summary Info -->
      <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-center justify-around text-center">
        <div>
          <span class="text-xs text-slate-500 block font-bold">أفراد الأسرة الحاضرين</span>
          <span class="text-xl font-black text-emerald-700 font-mono">{{ checkInData.totalPersons }} فرد</span>
        </div>
        <div class="h-8 w-px bg-slate-200"></div>
        <div>
          <span class="text-xs text-slate-500 block font-bold">رقم الأتوبيس</span>
          <span class="text-xl font-black text-slate-800 font-mono">أتوبيس {{ checkInData.busNumber }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          label="تم ومتابعة (Enter)"
          icon="pi pi-check"
          class="flex-1 !bg-emerald-600 !border-emerald-600 !text-white !py-3 !font-bold !text-base shadow-md hover:!bg-emerald-700"
          autofocus
          @click="visible = false"
        />
        <Button
          v-if="allowMove"
          label="تغيير الأتوبيس"
          icon="pi pi-arrow-right-arrow-left"
          severity="secondary"
          outlined
          class="!py-3 !font-bold"
          @click="openMoveDialog"
        />
      </div>

    </div>
  </Dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  checkInData: {
    type: Object,
    default: null
  },
  allowMove: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'change-bus', 'closed']);

const visible = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

function onClose() {
  emit('closed');
}

function openMoveDialog() {
  visible.value = false;
  emit('change-bus', props.checkInData?.student?.number);
}

// Handle Enter/Space key to dismiss quickly
function handleKeyDown(e) {
  if (visible.value && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
    e.preventDefault();
    visible.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>
