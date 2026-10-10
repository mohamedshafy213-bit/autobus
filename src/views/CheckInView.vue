<template>
  <div class="space-y-6 pb-12">
    
    <!-- Top Hero Section: Search Box & Live Counters -->
    <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <!-- Big Search Field (Barcode scanner friendly) -->
      <div class="relative z-10 max-w-3xl mx-auto text-center space-y-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
          <i class="pi pi-search"></i>
          <span>بوابة الاستقبال وتسكين الأتوبيسات</span>
        </div>
        
        <h2 class="text-2xl sm:text-3xl font-black font-cairo text-white">
          تسجيل حضور عائلات الخريجين
        </h2>
        
        <div class="relative mt-4">
          <div class="relative flex items-center">
            <input
              ref="searchInputRef"
              v-model="store.searchQuery"
              type="text"
              placeholder="ابحث بالاسم، الرقم العسكري، اسم أحد أفراد الأسرة، أو الرقم القومي..."
              class="w-full py-4 pe-14 ps-14 text-base sm:text-lg font-bold bg-white text-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 focus:border-emerald-600 transition-all placeholder:text-slate-400"
              autofocus
              @keydown.enter="handleSearchEnter"
            />
            <div class="absolute right-4 text-emerald-600 text-xl pointer-events-none">
              <i class="pi pi-search"></i>
            </div>
            <button
              v-if="store.searchQuery"
              @click="clearSearch"
              class="absolute left-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              title="مسح البحث"
            >
              <i class="pi pi-times text-base"></i>
            </button>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-300 px-2 mt-2">
            <span class="flex items-center gap-1.5">
              <i class="pi pi-info-circle text-emerald-400"></i>
              إذا كان هناك نتيجة واحدة، يؤدي الضغط على Enter لفتح نافذة اختيار الأتوبيس فوراً
            </span>
            <span v-if="store.searchQuery" class="font-bold text-emerald-300">
              النتائج: {{ filteredStudents.length }}
            </span>
          </div>
        </div>
      </div>

      <!-- Live Counters Grid (families arrived / total, persons arrived, remaining) -->
      <div class="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-700/60">
        
        <!-- Families Arrived / Total -->
        <div class="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/80 shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-bold">العائلات التي حضرت</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <i class="pi pi-check-circle text-sm"></i>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-emerald-400 font-mono">
              {{ stats.arrivedStudents }}
            </span>
            <span class="text-xs text-slate-400">/ {{ stats.totalStudents }} عائلة</span>
          </div>
          <ProgressBar
            :value="stats.totalStudents > 0 ? Math.round((stats.arrivedStudents / stats.totalStudents) * 100) : 0"
            :showValue="false"
            class="!h-1.5 !bg-slate-700 !mt-2"
          />
        </div>

        <!-- Persons Arrived / Total -->
        <div class="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/80 shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-bold">الأفراد الذين حضروا</span>
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <i class="pi pi-users text-sm"></i>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-blue-400 font-mono">
              {{ stats.arrivedPersons }}
            </span>
            <span class="text-xs text-slate-400">/ {{ stats.totalPersons }} فرد</span>
          </div>
          <ProgressBar
            :value="stats.totalPersons > 0 ? Math.round((stats.arrivedPersons / stats.totalPersons) * 100) : 0"
            :showValue="false"
            class="!h-1.5 !bg-slate-700 !mt-2"
          />
        </div>

        <!-- Remaining Persons & Families -->
        <div class="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/80 shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-300 font-bold">المتبقي لم يحضر</span>
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <i class="pi pi-clock text-sm"></i>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-amber-400 font-mono">
              {{ stats.remainingPersons }}
            </span>
            <span class="text-xs text-slate-400">فرد</span>
            <span class="text-xs text-slate-400 font-bold">({{ stats.remainingStudents }} عائلة)</span>
          </div>
          <div class="text-[11px] text-amber-300/80 mt-2 font-semibold">
            نسبة الحضور: {{ stats.totalPersons > 0 ? Math.round((stats.arrivedPersons / stats.totalPersons) * 100) : 0 }}%
          </div>
        </div>

      </div>

    </div>

    <!-- Main Table Card & Filters -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      <!-- Filters and Table Controls -->
      <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        <!-- Status Filter Tabs: all / arrived / not arrived -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-slate-500 me-1">التصفية:</span>
          <button
            @click="store.statusFilter = 'all'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              store.statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            الكل ({{ store.students.length }})
          </button>

          <button
            @click="store.statusFilter = 'arrived'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              store.statusFilter === 'arrived'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            ]"
          >
            <i class="pi pi-check text-[10px]"></i>
            حضر ({{ stats.arrivedStudents }})
          </button>

          <button
            @click="store.statusFilter = 'not_arrived'"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              store.statusFilter === 'not_arrived'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            ]"
          >
            لم يحضر ({{ stats.remainingStudents }})
          </button>
        </div>

        <!-- Bus filter dropdown & Reset -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-500">فلتر الأتوبيس:</span>
          <Select
            v-model="store.busFilter"
            :options="busFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="جميع الأتوبيسات"
            class="w-44 !text-xs font-bold"
          />
          <Button
            v-if="store.searchQuery || store.statusFilter !== 'all' || store.busFilter !== null"
            icon="pi pi-filter-slash"
            severity="secondary"
            text
            size="small"
            title="إلغاء جميع الفلاتر"
            @click="resetAllFilters"
          />
        </div>

      </div>

      <!-- Students DataTable with Expandable Rows -->
      <DataTable
        :value="filteredStudents"
        v-model:expandedRows="expandedRows"
        paginator
        :rows="15"
        :rowsPerPageOptions="[15, 30, 50, 100]"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        stripedRows
        dataKey="military_number"
      >
        <template #empty>
          <div class="p-8 text-center">
            <i class="pi pi-search text-4xl text-slate-300 mb-2"></i>
            <div class="text-base font-bold text-slate-700">لا توجد نتائج مطابقة للبحث أو الفلتر</div>
            <p class="text-xs text-slate-400 mt-1">تأكد من كتابة اسم الطالب أو الرقم العسكري بشكل صحيح</p>
          </div>
        </template>

        <!-- Expander Column for Family Members -->
        <Column expander style="width: 3rem" />

        <!-- Military Number -->
        <Column field="military_number" header="الرقم العسكري" sortable style="width: 14%;">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block text-xs">
              {{ data.military_number }}
            </span>
          </template>
        </Column>

        <!-- Student Name -->
        <Column field="name" header="اسم الطالب" sortable style="width: 25%;">
          <template #body="{ data }">
            <span class="font-bold text-slate-900 text-sm">
              {{ data.name }}
            </span>
          </template>
        </Column>

        <!-- Family Count -->
        <Column header="المرافقين" sortable style="width: 10%;">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-700 text-xs">
              {{ (data.families || []).length }} مرافق
            </span>
          </template>
        </Column>

        <!-- Total Persons (1 + family) -->
        <Column header="إجمالي الأفراد" sortable style="width: 12%;">
          <template #body="{ data }">
            <span class="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
              {{ data.persons_count }} فرد
            </span>
          </template>
        </Column>

        <!-- Status Tag (لم يحضر / حضر) -->
        <Column header="حالة الحضور" style="width: 12%;">
          <template #body="{ data }">
            <Tag
              v-if="data.bus_number"
              value="حضر"
              severity="success"
              class="!text-xs !font-bold"
            />
            <Tag
              v-else
              value="لم يحضر"
              severity="secondary"
              class="!text-xs !font-bold"
            />
          </template>
        </Column>

        <!-- Bus Number -->
        <Column header="رقم الأتوبيس" style="width: 12%;">
          <template #body="{ data }">
            <span
              v-if="data.bus_number"
              class="font-mono font-black text-white bg-emerald-600 px-3 py-1 rounded-lg shadow-sm text-xs"
            >
              أتوبيس {{ data.bus_number }}
            </span>
            <span v-else class="text-slate-400 text-xs font-semibold">
              —
            </span>
          </template>
        </Column>

        <!-- Action Button -->
        <Column header="الإجراءات" style="width: 15%; text-align: center;">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1.5">
              <!-- If Not Arrived: "تسجيل حضور" button -->
              <Button
                v-if="!data.bus_number"
                label="تسجيل حضور"
                icon="pi pi-check"
                size="small"
                class="!bg-emerald-600 !border-emerald-600 !text-white !font-bold !text-xs !py-1.5 !px-3 shadow-sm hover:!bg-emerald-700"
                :disabled="store.isWriteDisabled"
                @click="openBusPicker(data, 'seat')"
              />

              <!-- If Arrived: "نقل لأتوبيس آخر" & "إلغاء الحضور" -->
              <template v-else>
                <Button
                  label="نقل"
                  icon="pi pi-arrow-right-arrow-left"
                  size="small"
                  severity="secondary"
                  outlined
                  class="!font-bold !text-xs !py-1.5 !px-2.5"
                  :disabled="store.isWriteDisabled"
                  title="نقل لأتوبيس آخر"
                  @click="openBusPicker(data, 'move')"
                />

                <Button
                  label="إلغاء الحضور"
                  icon="pi pi-times"
                  size="small"
                  severity="danger"
                  outlined
                  class="!font-bold !text-xs !py-1.5 !px-2.5"
                  :disabled="store.isWriteDisabled"
                  title="إلغاء تسجيل الحضور"
                  @click="confirmUnseat(data)"
                />
              </template>
            </div>
          </template>
        </Column>

        <!-- Expandable Row: Family Members Details -->
        <template #expansion="{ data }">
          <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200 my-2 me-4 ms-10">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <i class="pi pi-users text-emerald-600"></i>
                أفراد أسرة الطالب: {{ data.name }} ({{ (data.families || []).length }} أفراد)
              </span>
            </div>

            <div v-if="!data.families || data.families.length === 0" class="text-xs text-slate-400 italic">
              لا يوجد مرافقين مسجلين لهذا الطالب (يحضر بمفرده).
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div
                v-for="member in data.families"
                :key="member.id"
                class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs text-xs space-y-1"
              >
                <div class="font-bold text-slate-800">{{ member.name }}</div>
                <div class="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>القرابة: <strong>{{ member.relation || '—' }}</strong></span>
                  <span class="font-mono">{{ member.national_id || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </DataTable>

    </div>

    <!-- Bus Picker Dialog -->
    <BusPickerDialog
      v-model="busPickerVisible"
      :student="activeStudent"
      :mode="busPickerMode"
      @seated="handleSeatedSuccess"
    />

    <!-- Large Confirmation Dialog after successful seating -->
    <CheckInModal
      v-model="successModalVisible"
      :checkInData="successData"
      :allowMove="true"
      @move="handleOpenMoveFromSuccess"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import BusPickerDialog from '../components/BusPickerDialog.vue';
import CheckInModal from '../components/CheckInModal.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const store = useBusesStore();
const confirm = useConfirm();
const toast = useToast();

const searchInputRef = ref(null);
const expandedRows = ref([]);

const busPickerVisible = ref(false);
const busPickerMode = ref('seat'); // 'seat' | 'move'
const activeStudent = ref(null);

const successModalVisible = ref(false);
const successData = ref(null);

const stats = computed(() => store.stats);
const filteredStudents = computed(() => store.filteredStudents);

const busFilterOptions = computed(() => {
  const options = [{ label: 'جميع الأتوبيسات', value: null }];
  for (let i = 1; i <= store.settings.busCount; i++) {
    options.push({ label: `أتوبيس رقم ${i}`, value: i });
  }
  return options;
});

onMounted(() => {
  store.init();
});

function clearSearch() {
  store.searchQuery = '';
  if (searchInputRef.value) searchInputRef.value.focus();
}

function resetAllFilters() {
  store.searchQuery = '';
  store.statusFilter = 'all';
  store.busFilter = null;
}

// Enter on search box: if exactly 1 match, open bus picker!
function handleSearchEnter() {
  const matches = filteredStudents.value;
  if (matches.length === 1) {
    const student = matches[0];
    if (!student.bus_number) {
      openBusPicker(student, 'seat');
    } else {
      openBusPicker(student, 'move');
    }
  }
}

function openBusPicker(student, mode = 'seat') {
  activeStudent.value = student;
  busPickerMode.value = mode;
  busPickerVisible.value = true;
}

function handleSeatedSuccess(data) {
  // Show large confirmation modal
  successData.value = {
    student: {
      name: data.studentName,
      number: data.studentNumber
    },
    busNumber: data.busNumber,
    totalPersons: data.totalPersons
  };
  successModalVisible.value = true;

  // Clear search for next person
  store.searchQuery = '';
  if (searchInputRef.value) searchInputRef.value.focus();
}

function handleOpenMoveFromSuccess() {
  successModalVisible.value = false;
  if (activeStudent.value) {
    openBusPicker(activeStudent.value, 'move');
  }
}

function confirmUnseat(student) {
  confirm.require({
    message: `هل أنت متأكد من إلغاء حضور أسرة الطالب "${student.name}" من أتوبيس رقم ${student.bus_number}؟`,
    header: 'تأكيد إلغاء الحضور',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'نعم، إلغاء الحضور',
    rejectLabel: 'تراجع',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.unseatFamily(student.military_number);
        toast.add({
          severity: 'info',
          summary: 'تم إلغاء الحضور',
          detail: `تم إخلاء مقاعد أسرة الطالب ${student.name}`,
          life: 3000
        });
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err.message || 'تعذر إلغاء الحضور',
          life: 4000
        });
      }
    }
  });
}
</script>
