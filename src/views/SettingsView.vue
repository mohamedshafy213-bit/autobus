<template>
  <div class="space-y-6 pb-12">
    
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-900 flex items-center gap-2">
          <i class="pi pi-cog text-emerald-600 text-2xl"></i>
          <span>إعدادات أسطول الأتوبيسات والمنظومة</span>
        </h2>
        <p class="text-xs text-slate-500 mt-1 font-semibold">
          تحديد عدد الأتوبيسات، السعات الافتراضية، التخصيص لكل أتوبيس، وتصفير الحضور والنسخ الاحتياطي
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <Button
          label="تحميل نسخة احتياطية (.db)"
          icon="pi pi-download"
          class="!bg-slate-800 !border-slate-800 !text-white font-bold text-xs hover:!bg-slate-900 shadow-sm"
          title="تحميل نسخة كاملة من قاعدة بيانات المنظومة"
          @click="downloadBackup"
        />

        <Button
          label="تصفير الحضور (إخلاء المقاعد)"
          icon="pi pi-refresh"
          severity="danger"
          outlined
          class="font-bold text-xs"
          :disabled="store.isWriteDisabled"
          title="مسح جميع بيانات التسكين وإعادة ضبط الأتوبيسات لتكون فارغة"
          @click="confirmResetSeating"
        />
      </div>
    </div>

    <!-- General Settings Form -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <h3 class="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
        <i class="pi pi-sliders-h text-emerald-600"></i>
        <span>السعات العامة والافتراضية للأسطول</span>
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <!-- Number of Buses -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            عدد الأتوبيسات الإجمالي:
          </label>
          <div class="flex items-center gap-2">
            <InputNumber
              v-model="form.busCount"
              :min="1"
              :max="100"
              showButtons
              buttonLayout="horizontal"
              decrementButtonClass="p-button-secondary !w-9"
              incrementButtonClass="p-button-secondary !w-9"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              class="w-full !text-sm font-mono font-bold"
            />
          </div>
          <span class="text-[11px] text-slate-400 block">
            الأتوبيسات ستكون مرقمة من 1 إلى {{ form.busCount }}
          </span>
        </div>

        <!-- Default Max Families -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            الحد الأقصى الافتراضي للعائلات:
          </label>
          <InputNumber
            v-model="form.defaultMaxFamilies"
            :min="1"
            :max="50"
            class="w-full !text-sm font-mono font-bold"
          />
          <span class="text-[11px] text-slate-400 block">
            الافتراضي الموصى به: 8 عائلات لكل أتوبيس
          </span>
        </div>

        <!-- Default Max Persons -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            الحد الأقصى الافتراضي للأفراد:
          </label>
          <InputNumber
            v-model="form.defaultMaxPersons"
            :min="1"
            :max="150"
            class="w-full !text-sm font-mono font-bold"
          />
          <span class="text-[11px] text-slate-400 block">
            الافتراضي الموصى به: 40 فرد لكل أتوبيس
          </span>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <Button
          label="حفظ إعدادات الأسطول"
          icon="pi pi-check"
          class="!bg-emerald-600 !border-emerald-600 !text-white font-bold text-xs !py-2.5 !px-5"
          :loading="saving"
          :disabled="store.isWriteDisabled"
          @click="saveSettings"
        />
      </div>
    </div>

    <!-- Per-Bus Overrides Inline-Editable Table -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
            <i class="pi pi-table text-emerald-600"></i>
            <span>تخصيص سعة معينة لكل أتوبيس (Per-Bus Overrides)</span>
          </h3>
          <p class="text-[11px] text-slate-500 font-semibold mt-0.5">
            يمكنك تخصيص سعة لأتوبيس معين تختلف عن السعات الافتراضية للأسطول
          </p>
        </div>

        <Button
          v-if="hasOverrides"
          label="إعادة ضبط الكل للافتراضي"
          icon="pi pi-undo"
          size="small"
          severity="secondary"
          text
          class="!text-xs font-bold"
          @click="clearAllOverrides"
        />
      </div>

      <!-- Overrides Table -->
      <DataTable
        :value="busTableData"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        stripedRows
      >
        <Column field="busNumber" header="رقم الأتوبيس" style="width: 15%;">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-slate-800 text-white font-mono font-black flex items-center justify-center text-xs">
                {{ data.busNumber }}
              </span>
              <span class="text-xs font-bold text-slate-700">أتوبيس {{ data.busNumber }}</span>
            </div>
          </template>
        </Column>

        <Column header="سعة العائلات (القصوى)" style="width: 28%;">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <InputNumber
                v-model="data.maxFamilies"
                :min="1"
                :max="50"
                class="w-24 !text-xs font-mono font-bold"
                @update:modelValue="markOverride(data)"
              />
              <span class="text-xs text-slate-400">عائلة</span>
            </div>
          </template>
        </Column>

        <Column header="سعة الأفراد (القصوى)" style="width: 28%;">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <InputNumber
                v-model="data.maxPersons"
                :min="1"
                :max="150"
                class="w-24 !text-xs font-mono font-bold"
                @update:modelValue="markOverride(data)"
              />
              <span class="text-xs text-slate-400">فرد</span>
            </div>
          </template>
        </Column>

        <Column header="الحالة" style="width: 15%;">
          <template #body="{ data }">
            <Tag
              v-if="data.isOverridden"
              value="مخصص"
              severity="info"
              class="!text-xs !font-bold"
            />
            <Tag
              v-else
              value="افتراضي"
              severity="secondary"
              class="!text-xs !font-bold"
            />
          </template>
        </Column>

        <Column header="إجراء" style="width: 14%; text-align: center;">
          <template #body="{ data }">
            <Button
              v-if="data.isOverridden"
              icon="pi pi-times"
              size="small"
              severity="danger"
              text
              class="!p-1"
              title="إلغاء التخصيص والعودة للافتراضي"
              @click="resetSingleOverride(data)"
            />
          </template>
        </Column>
      </DataTable>

      <div class="flex justify-end pt-3 border-t border-slate-100">
        <Button
          label="حفظ جميع التخصيصات"
          icon="pi pi-save"
          class="!bg-emerald-600 !border-emerald-600 !text-white font-bold text-xs !py-2.5 !px-5"
          :loading="saving"
          :disabled="store.isWriteDisabled"
          @click="saveSettings"
        />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const store = useBusesStore();
const confirm = useConfirm();
const toast = useToast();

const saving = ref(false);

const form = reactive({
  busCount: 28,
  defaultMaxFamilies: 8,
  defaultMaxPersons: 40,
  overrides: {}
});

const busTableData = ref([]);

function populateFormFromStore() {
  form.busCount = store.settings.busCount || 28;
  form.defaultMaxFamilies = store.settings.defaultMaxFamilies || 8;
  form.defaultMaxPersons = store.settings.defaultMaxPersons || 40;
  form.overrides = { ...(store.settings.overrides || {}) };

  buildBusTableData();
}

function buildBusTableData() {
  const rows = [];
  for (let i = 1; i <= form.busCount; i++) {
    const key = String(i);
    const ov = form.overrides[key];
    rows.push({
      busNumber: i,
      maxFamilies: ov && ov.maxFamilies !== undefined ? Number(ov.maxFamilies) : form.defaultMaxFamilies,
      maxPersons: ov && ov.maxPersons !== undefined ? Number(ov.maxPersons) : form.defaultMaxPersons,
      isOverridden: !!ov
    });
  }
  busTableData.value = rows;
}

watch(() => store.settings, () => {
  populateFormFromStore();
}, { deep: true, immediate: true });

watch(() => form.busCount, () => {
  buildBusTableData();
});

const hasOverrides = computed(() => {
  return Object.keys(form.overrides).length > 0;
});

function markOverride(row) {
  const key = String(row.busNumber);
  form.overrides[key] = {
    maxFamilies: Number(row.maxFamilies),
    maxPersons: Number(row.maxPersons)
  };
  row.isOverridden = true;
}

function resetSingleOverride(row) {
  const key = String(row.busNumber);
  delete form.overrides[key];
  row.maxFamilies = form.defaultMaxFamilies;
  row.maxPersons = form.defaultMaxPersons;
  row.isOverridden = false;
}

function clearAllOverrides() {
  form.overrides = {};
  buildBusTableData();
}

async function saveSettings() {
  saving.value = true;
  try {
    // Compile overrides
    const cleanOverrides = {};
    busTableData.value.forEach(row => {
      if (row.isOverridden) {
        cleanOverrides[String(row.busNumber)] = {
          maxFamilies: Number(row.maxFamilies),
          maxPersons: Number(row.maxPersons)
        };
      }
    });

    await store.updateSettings({
      busCount: Number(form.busCount),
      defaultMaxFamilies: Number(form.defaultMaxFamilies),
      defaultMaxPersons: Number(form.defaultMaxPersons),
      overrides: cleanOverrides
    });

    toast.add({
      severity: 'success',
      summary: 'تم الحفظ',
      detail: 'تم حفظ إعدادات الأتوبيسات وتطبيق السعات بنجاح',
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'تعذر الحفظ',
      detail: err.message || 'حدث خطأ في الخادم',
      life: 5000
    });
  } finally {
    saving.value = false;
  }
}

function confirmResetSeating() {
  confirm.require({
    message: 'هل أنت متأكد من تصفير الحضور وإخلاء جميع الأتوبيسات؟ لن يتم حذف الطلاب أو أسرهم، بل سيتم فقط إفراغ مقاعد الأتوبيسات وإعادة حالتهم إلى "لم يحضر".',
    header: 'تأكيد تصفير الحضور',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'نعم، تصفير الحضور',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.resetSeating();
        toast.add({
          severity: 'info',
          summary: 'تم تصفير الحضور',
          detail: 'تم إخلاء جميع الأتوبيسات بنجاح',
          life: 3000
        });
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err.message || 'فشل تصفير الحضور',
          life: 4000
        });
      }
    }
  });
}

function downloadBackup() {
  window.open('/api/export/backup', '_blank');
  toast.add({
    severity: 'info',
    summary: 'نسخة احتياطية',
    detail: 'جاري تحميل ملف قاعدة البيانات...',
    life: 3000
  });
}
</script>
