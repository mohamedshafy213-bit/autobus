<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="نقل العائلة إلى أتوبيس آخر"
    :style="{ width: '480px', maxWidth: '95vw' }"
    class="move-bus-dialog"
  >
    <div v-if="studentData" class="space-y-4 py-2">
      <!-- Student summary -->
      <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs text-slate-500 font-bold">الطالب</span>
          <span class="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded">{{ studentData.number }}</span>
        </div>
        <div class="text-base font-black text-slate-800">{{ studentData.name }}</div>
        <div class="text-xs text-slate-600 mt-1 flex gap-3">
          <span>أفراد الأسرة: <strong>{{ studentData.totalMembersCount }}</strong></span>
          <span>الحاضرين: <strong>{{ studentData.attendedCount }}</strong></span>
          <span class="text-emerald-700 font-bold">الأتوبيس الحالي: {{ studentData.busNumber ? `أتوبيس ${studentData.busNumber}` : 'غير مسكن' }}</span>
        </div>
      </div>

      <!-- Bus Selection -->
      <div>
        <label class="block text-sm font-bold text-slate-700 mb-2">
          اختر الأتوبيس المطلوب (يمكنك اختيار أي أتوبيس بحرية):
        </label>
        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="bus in busOptions"
            :key="bus.number"
            @click="selectedBus = bus.number"
            :class="[
              'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between',
              selectedBus === bus.number
                ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/30'
                : 'border-slate-200 hover:bg-slate-50'
            ]"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                :class="selectedBus === bus.number ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'"
              >
                {{ bus.number }}
              </div>
              <div>
                <div class="text-sm font-bold text-slate-800">
                  أتوبيس رقم {{ bus.number }}
                </div>
                <div class="text-xs text-slate-500 flex gap-2">
                  <span>الأفراد: {{ bus.currentPersons }}/{{ bus.maxPersons }}</span>
                  <span>العائلات: {{ bus.currentFamilies }}/{{ bus.maxFamilies }}</span>
                </div>
              </div>
            </div>

            <div>
              <span
                v-if="bus.isCurrent"
                class="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
              >
                الأتوبيس الحالي
              </span>
              <span
                v-else-if="bus.willExceed"
                class="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300"
              >
                ⚠️ سيتجاوز السعة
              </span>
              <span
                v-else
                class="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"
              >
                متاح
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button
          label="إلغاء"
          severity="secondary"
          outlined
          @click="visible = false"
        />
        <Button
          label="تأكيد النقل"
          icon="pi pi-check"
          class="!bg-emerald-600 !border-emerald-600 !text-white font-bold"
          :disabled="!selectedBus || selectedBus === studentData?.busNumber"
          @click="confirmMove"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  studentNumber: {
    type: [String, Number],
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'moved']);

const store = useBusesStore();
const toast = useToast();

const visible = ref(props.modelValue);
const selectedBus = ref(null);

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val && studentData.value) {
    selectedBus.value = null;
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

const studentData = computed(() => {
  if (!props.studentNumber) return null;
  return store.studentsWithFamily.find(s => String(s.number) === String(props.studentNumber));
});

const busOptions = computed(() => {
  if (!studentData.value) return [];
  const familyPersons = studentData.value.attendedCount > 0 ? studentData.value.attendedCount : studentData.value.totalMembersCount;
  const currentBusNum = Number(studentData.value.busNumber);

  return store.buses.map(bus => {
    const isCurrent = Number(bus.number) === currentBusNum;
    const currentFamilies = store.busFamilies(bus.number).length;
    const currentPersons = store.busPersons(bus.number);

    const willExceed = !isCurrent && (
      (currentFamilies + 1 > bus.maxFamilies) ||
      (currentPersons + familyPersons > bus.maxPersons)
    );

    return {
      number: bus.number,
      maxFamilies: bus.maxFamilies,
      maxPersons: bus.maxPersons,
      currentFamilies,
      currentPersons,
      isCurrent,
      willExceed
    };
  });
});

function confirmMove() {
  if (!studentData.value || !selectedBus.value) return;

  const result = store.moveFamily(studentData.value.number, selectedBus.value);
  if (result.success) {
    if (result.exceedsLimit) {
      toast.add({
        severity: 'warn',
        summary: '⚠️ تحذير: تجاوز سعة الأتوبيس',
        detail: `تحذير: لقد تجاوزت سعة الأتوبيس المسموح بها في أتوبيس رقم (${result.newBusNumber})! الركاب الآن: ${result.newPersonsCount}/${result.maxPersons} فرد. يرجى نقل بعض الركاب إلى أتوبيس آخر لأنك تخطيت الحد الأقصى.`,
        life: 8000
      });
    } else {
      toast.add({
        severity: 'success',
        summary: 'تم النقل بنجاح',
        detail: result.message,
        life: 3500
      });
    }
    visible.value = false;
    emit('moved', { studentNumber: studentData.value.number, busNumber: selectedBus.value });
  } else {
    toast.add({
      severity: 'error',
      summary: 'فشل النقل',
      detail: result.message,
      life: 4000
    });
  }
}
</script>
