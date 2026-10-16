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
        <!-- <Button
          label="تحميل نسخة احتياطية (.db)"
          icon="pi pi-download"
          class="!bg-slate-800 !border-slate-800 !text-white font-bold text-xs hover:!bg-slate-900 shadow-sm"
          title="تحميل نسخة كاملة من قاعدة بيانات المنظومة"
          @click="downloadBackup"
        /> -->

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

    <!-- Automatic Seating (تسكين تلقائي) Toggle Card
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="form.autoSeating ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'">
            <i class="pi pi-bolt text-lg"></i>
          </div>
          <h3 class="text-base font-black text-slate-800">
            تسكين تلقائي (Auto-Assign Bus)
          </h3>
          <Tag
            :value="form.autoSeating ? 'مفعل ✓' : 'معطل (تسكين يدوي)'"
            :severity="form.autoSeating ? 'success' : 'secondary'"
            class="!text-xs !font-bold"
          />
        </div>
        <p class="text-xs text-slate-500 font-semibold max-w-2xl">
          عند تفعيل <strong>"تسكين تلقائي"</strong>: بمجرد تأكيد حضور أفراد الأسرة عند البوابة، يقوم النظام فوراً باختيار أول أتوبيس به مقاعد شاغرة وتسجيلهم فيه تلقائياً دون الحاجة لاختيار الأتوبيس يدوياً.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          :label="form.autoSeating ? 'التسكين التلقائي (مفعل ✓)' : 'تفعيل التسكين التلقائي'"
          :icon="form.autoSeating ? 'pi pi-check-circle' : 'pi pi-bolt'"
          :class="[
            'font-bold text-xs !py-3 !px-5 transition-all shadow-sm',
            form.autoSeating 
              ? '!bg-emerald-600 !border-emerald-600 !text-white hover:!bg-emerald-700' 
              : '!bg-amber-600 !border-amber-600 !text-white hover:!bg-amber-700'
          ]"
          :disabled="store.isWriteDisabled || saving"
          @click="toggleAutoSeating"
        />
      </div>
    </div> -->

    <!-- Backup Server & Failover Card (السيرفر الاحتياطي وإدارة الطوارئ) -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <i class="pi pi-server text-lg"></i>
            </div>
            <h3 class="text-base font-black text-slate-800">
              السيرفر الاحتياطي وإدارة الطوارئ (Backup Server & Auto-Failover)
            </h3>
            <Tag
              :value="store.failover.backupOnline ? 'الاحتياطي جاهز ومتصل ✓' : (form.backupServerUrl ? 'الاحتياطي غير متصل' : 'غير محدد')"
              :severity="store.failover.backupOnline ? 'success' : (form.backupServerUrl ? 'danger' : 'secondary')"
              class="!text-xs !font-bold"
            />
          </div>
          <p class="text-xs text-slate-500 font-semibold max-w-2xl">
            يمكنك تشغيل جهاز لابتوب ثانٍ كسيرفر احتياطي. يقوم النظام بنسخ وتحديث قاعدة البيانات إليه لحظياً مع كل عملية تسكين، وفي حال تعطل السيرفر الرئيسي يتحول النظام إليه تلقائياً دون انقطاع العمل.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Manual Switch button between Primary and Backup -->
          <Button
            v-if="store.failover.activeServer === 'primary' && form.backupServerUrl"
            label="تحويل إلى الاحتياطي (اختبار طوارئ) ⚡"
            icon="pi pi-bolt"
            severity="warn"
            outlined
            size="small"
            class="!text-xs font-bold"
            @click="switchToServer('backup')"
          />
          <Button
            v-else-if="store.failover.activeServer === 'backup'"
            label="العودة للسيرفر الرئيسي ⚡"
            icon="pi pi-arrow-left"
            severity="success"
            size="small"
            class="!text-xs font-bold !bg-emerald-600 !border-emerald-600 !text-white"
            @click="switchToServer('primary')"
          />
        </div>
      </div>

      <!-- Settings Inputs & Live Status -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <!-- Input: Backup Server URL -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            عنوان السيرفر الاحتياطي (Backup IP / URL):
          </label>
          <div class="flex items-center gap-2">
            <InputText
              v-model="form.backupServerUrl"
              placeholder="مثال: http://192.168.20.102:3000"
              class="w-full !text-xs font-mono font-bold"
            />
            <Button
              label="حفظ العنوان"
              icon="pi pi-check"
              size="small"
              class="!text-xs !font-bold shrink-0 !bg-slate-800 !border-slate-800 !text-white"
              :loading="saving"
              @click="saveBackupUrl"
            />
          </div>
          <span class="text-[11px] text-slate-400 block">
            اكتب IP اللابتوب الثاني متبوعاً بالمنفذ :3000 (مثلاً http://192.168.20.102:3000)
          </span>
        </div>

        <!-- Sync Actions & Status -->
        <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700">السيرفر النشط حالياً:</span>
            <span class="font-mono font-black" :class="store.failover.activeServer === 'backup' ? 'text-amber-600' : 'text-purple-600'">
              {{ store.failover.activeServer === 'backup' ? 'السيرفر الاحتياطي (BACKUP)' : 'السيرفر الرئيسي (PRIMARY)' }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700">حالة السيرفر الاحتياطي:</span>
            <span class="font-bold flex items-center gap-1.5" :class="store.failover.backupOnline ? 'text-emerald-600' : 'text-red-500'">
              <span class="w-2 h-2 rounded-full" :class="store.failover.backupOnline ? 'bg-emerald-500' : 'bg-red-500'"></span>
              {{ store.failover.backupOnline ? 'متصل وجاهز للاستلام ✓' : (form.backupServerUrl ? 'غير متاح / مغلق' : 'لم يتم تحديد IP') }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-slate-500">آخر توقيت مزامنة ناجحة:</span>
            <span class="font-mono text-slate-600">
              {{ store.failover.lastSyncTime ? new Date(store.failover.lastSyncTime).toLocaleTimeString('ar-EG') : 'لم تتم بعد' }}
            </span>
          </div>

          <div class="flex items-center gap-2 pt-1 border-t border-slate-200">
            <Button
              label="مزامنة الآن إلى الاحتياطي 🔄"
              icon="pi pi-sync"
              size="small"
              class="!text-xs font-bold !bg-purple-600 !border-purple-600 !text-white flex-1"
              :disabled="!form.backupServerUrl || syncing"
              :loading="syncing"
              @click="handleManualSyncToBackup"
            />

            <Button
              label="سحب البيانات من الرئيسي 📥"
              icon="pi pi-download"
              size="small"
              severity="secondary"
              outlined
              class="!text-xs font-bold flex-1"
              :disabled="syncing"
              :loading="syncing"
              title="سحب أحدث قاعدة بيانات من السيرفر الرئيسي إلى هذا الجهاز"
              @click="handleManualPullFromPrimary"
            />
          </div>
        </div>
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

        <!-- Default Max Regular Families (<= 4 invitations) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            حد عائلات 4 دعوات أو أقل (الافتراضي 7):
          </label>
          <InputNumber
            v-model="form.defaultMaxRegularFamilies"
            :min="1"
            :max="30"
            class="w-full !text-sm font-mono font-bold"
          />
          <span class="text-[11px] text-slate-400 block">
            عداد العائلات العادية لكل أتوبيس (الموصى به: 7)
          </span>
        </div>

        <!-- Default Max Special Families (> 4 invitations) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            حد عائلات أكثر من 4 دعوات (الافتراضي 2):
          </label>
          <InputNumber
            v-model="form.defaultMaxSpecialFamilies"
            :min="1"
            :max="15"
            class="w-full !text-sm font-mono font-bold"
          />
          <span class="text-[11px] text-slate-400 block">
            عداد أسر الـ 6 دعوات الخاصة (الموصى به: 2)
          </span>
        </div>

        <!-- Default Max Families -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">
            إجمالي الحد الأقصى للعائلات:
          </label>
          <InputNumber
            v-model="form.defaultMaxFamilies"
            :min="1"
            :max="50"
            class="w-full !text-sm font-mono font-bold"
          />
          <span class="text-[11px] text-slate-400 block">
            إجمالي العائلات (الافتراضي: 9 عائلات = 7 + 2)
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
            الافتراضي الموصى به: 50 فرد لكل أتوبيس
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
const syncing = ref(false);

const form = reactive({
  busCount: 28,
  defaultMaxFamilies: 9,
  defaultMaxPersons: 50,
  defaultMaxRegularFamilies: 7,
  defaultMaxSpecialFamilies: 2,
  autoSeating: false,
  backupServerUrl: '',
  overrides: {}
});

const busTableData = ref([]);

function populateFormFromStore() {
  form.busCount = store.settings.busCount || 28;
  form.defaultMaxFamilies = store.settings.defaultMaxFamilies || 9;
  form.defaultMaxPersons = store.settings.defaultMaxPersons || 50;
  form.defaultMaxRegularFamilies = store.settings.defaultMaxRegularFamilies || 7;
  form.defaultMaxSpecialFamilies = store.settings.defaultMaxSpecialFamilies || 2;
  form.autoSeating = !!store.settings.autoSeating;
  form.backupServerUrl = store.settings.backupServerUrl || store.failover.backupUrl || '';
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

async function toggleAutoSeating() {
  form.autoSeating = !form.autoSeating;
  await saveSettings();
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
      defaultMaxRegularFamilies: Number(form.defaultMaxRegularFamilies || 7),
      defaultMaxSpecialFamilies: Number(form.defaultMaxSpecialFamilies || 2),
      autoSeating: Boolean(form.autoSeating),
      backupServerUrl: String(form.backupServerUrl || '').trim(),
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

async function saveBackupUrl() {
  saving.value = true;
  try {
    await store.setBackupServerUrl(form.backupServerUrl);
    toast.add({
      severity: 'success',
      summary: 'تم الحفظ',
      detail: 'تم حفظ وتحديث عنوان السيرفر الاحتياطي بنجاح',
      life: 3000
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'خطأ',
      detail: err.message || 'تعذر حفظ عنوان السيرفر الاحتياطي',
      life: 4000
    });
  } finally {
    saving.value = false;
  }
}

async function handleManualSyncToBackup() {
  if (!form.backupServerUrl) return;
  syncing.value = true;
  try {
    const res = await store.syncNowToBackup();
    if (res && res.success) {
      toast.add({
        severity: 'success',
        summary: 'تمت المزامنة بنجاح 🔄',
        detail: 'تم نقل أحدث نسخة من قاعدة البيانات إلى السيرفر الاحتياطي',
        life: 4000
      });
    } else {
      toast.add({
        severity: 'warn',
        summary: 'تعذر الاتصال بالاحتياطي',
        detail: (res && res.error) || 'تأكد من تشغيل السيرفر على الجهاز الثاني وسلامة الكابل',
        life: 5000
      });
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'خطأ في المزامنة',
      detail: err.message || 'حدث خطأ أثناء الاتصال بالسيرفر الاحتياطي',
      life: 5000
    });
  } finally {
    syncing.value = false;
  }
}

async function handleManualPullFromPrimary() {
  syncing.value = true;
  try {
    const res = await store.pullNowFromPrimary();
    toast.add({
      severity: 'success',
      summary: 'تم استيراد البيانات 📥',
      detail: `تم سحب وتطبيق أحدث قاعدة بيانات بنجاح (${res.result.studentsCount} طالب)`,
      life: 4000
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'خطأ في سحب البيانات',
      detail: err.message || 'تعذر سحب البيانات من السيرفر الرئيسي',
      life: 5000
    });
  } finally {
    syncing.value = false;
  }
}

async function switchToServer(target) {
  await store.switchActiveServer(target);
  toast.add({
    severity: target === 'backup' ? 'warn' : 'success',
    summary: target === 'backup' ? 'وضع الطوارئ (السيرفر الاحتياطي)' : 'السيرفر الرئيسي',
    detail: target === 'backup' ? 'تم تحويل العميل للعمل على السيرفر الاحتياطي' : 'تمت العودة للعمل على السيرفر الرئيسي',
    life: 4000
  });
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
