<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="dialogTitle"
    :style="{ width: '500px', maxWidth: '95vw' }"
    class="print-bus-dialog rounded-2xl"
  >
    <div class="space-y-4 py-2">
      <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
        <i class="pi pi-info-circle text-emerald-600 text-lg mt-0.5"></i>
        <div>
          <span class="font-bold block">معلومات الكشف المطبوع:</span>
          يرجى إدخال أسماء مسؤولي الرحلة لاعتمادها أسفل الكشف الرسمي للأتوبيس. يتم تذكر هذه الأسماء تلقائياً.
        </div>
      </div>

      <!-- Bus Manager -->
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">
          قائد المأمورية <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="staff.manager"
          placeholder="أدخل اسم قائد المأمورية"
          class="w-full font-bold"
          :class="{ 'p-invalid': submitted && !staff.manager.trim() }"
        />
        <small v-if="submitted && !staff.manager.trim()" class="text-red-500 text-xs">
          اسم قائد المأمورية مطلوب
        </small>
      </div>

    </div>

    <template #footer>
      <div class="flex items-center justify-between w-full pt-2">
        <Button
          label="إلغاء"
          severity="secondary"
          outlined
          @click="visible = false"
        />

        <Button
          label="طباعة الكشف / حفظ PDF"
          icon="pi pi-print"
          class="!bg-emerald-600 !border-emerald-600 !text-white font-bold"
          @click="handlePrintWindow"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  targetBusNumber: {
    type: [Number, String],
    default: null // null means print all buses
  }
});

const emit = defineEmits(['update:modelValue', 'ready-to-print']);
const toast = useToast();

const visible = ref(props.modelValue);
const submitted = ref(false);

const staff = reactive({
  manager: ''
});

const dialogTitle = computed(() => {
  if (props.targetBusNumber) {
    return `طباعة كشف أتوبيس رقم (${props.targetBusNumber})`;
  }
  return 'طباعة كشوف جميع الأتوبيسات';
});

function loadStaffFromStorage() {
  try {
    const saved = localStorage.getItem('autobus_print_staff');
    if (saved) {
      const parsed = JSON.parse(saved);
      staff.manager = parsed.manager || '';
    }
  } catch (err) {
    console.error('Error loading print staff:', err);
  }
}

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) {
    submitted.value = false;
    loadStaffFromStorage();
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

function validate() {
  submitted.value = true;
  if (!staff.manager.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'بيانات غير مكتملة',
      detail: 'يرجى إدخال اسم قائد المأمورية.',
      life: 3000
    });
    return false;
  }

  // Save to localStorage
  try {
    localStorage.setItem('autobus_print_staff', JSON.stringify({
      manager: staff.manager.trim()
    }));
  } catch (err) {
    console.error('Error saving print staff:', err);
  }

  return true;
}

function handlePrintWindow() {
  if (!validate()) return;
  visible.value = false;
  emit('ready-to-print', {
    mode: 'window',
    busNumber: props.targetBusNumber,
    staff: { ...staff }
  });
}
</script>
