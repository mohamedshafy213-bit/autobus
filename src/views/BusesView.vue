<template>
  <div class="space-y-6 pb-12">
    
    <!-- Top Header Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div>
        <div class="flex items-center gap-2.5">
          <span class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/30">
            <i class="pi pi-truck"></i>
          </span>
          <div>
            <h2 class="text-2xl font-black text-slate-900">
              أسطول الأتوبيسات وتوزيع الركاب ({{ store.settings.busCount }} أتوبيس)
            </h2>
            <p class="text-xs text-slate-500 mt-0.5 font-semibold">
              متابعة الإشغال والسعات، ونقل العائلات، وطباعة الكشوف الرسمية
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons
      <div class="flex items-center gap-2.5 flex-wrap">
        <Button
          label="طباعة كل الأتوبيسات"
          icon="pi pi-print"
          class="!bg-slate-900 !border-slate-900 !text-white font-bold text-xs sm:text-sm shadow-md hover:!bg-slate-800 transition"
          @click="openPrintDialog(null)"
        />
      </div> -->
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <!-- Filter Chips -->
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-bold text-slate-500 me-1">تصفية:</span>
        <button
          @click="busStatusFilter = 'all'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            busStatusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          الكل ({{ busCardsData.length }})
        </button>

        <!-- Category Filters -->
        <button
          @click="busStatusFilter = 'available_regular'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            busStatusFilter === 'available_regular'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          ]"
          title="أتوبيسات بها أماكن لعائلات 4 دعوات أو أقل (أقل من 7)"
        >
          متاح (≤ 4 دعوات) ({{ busCardsData.filter(b => b.regularFamiliesCount < b.maxRegularFamilies).length }})
        </button>

        <button
          @click="busStatusFilter = 'available_special'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1',
            busStatusFilter === 'available_special'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
          ]"
          title="أتوبيسات بها أماكن لعائلات أكثر من 4 دعوات (أقل من 2)"
        >
          <span>★ متاح (> 4 دعوات) ({{ busCardsData.filter(b => b.specialFamiliesCount < b.maxSpecialFamilies).length }})</span>
        </button>

        <button
          @click="busStatusFilter = 'has_passengers'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            busStatusFilter === 'has_passengers'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
          ]"
        >
          بها ركاب ({{ busCardsData.filter(b => b.familiesCount > 0).length }})
        </button>

        <button
          @click="busStatusFilter = 'full'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            busStatusFilter === 'full'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          ]"
        >
          مكتملة ({{ busCardsData.filter(b => b.isFull && !b.isOverLimit).length }})
        </button>

        <button
          @click="busStatusFilter = 'empty'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            busStatusFilter === 'empty'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          فارغة ({{ busCardsData.filter(b => b.familiesCount === 0).length }})
        </button>

        <button
          v-if="busCardsData.some(b => b.isOverLimit)"
          @click="busStatusFilter = 'overlimit'"
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all animate-pulse',
            busStatusFilter === 'overlimit'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          ]"
        >
          ⚠️ تجاوز الحد ({{ busCardsData.filter(b => b.isOverLimit).length }})
        </button>
      </div>

      <!-- Search -->
      <div class="w-full md:w-72">
        <IconField iconPosition="left">
          <InputIcon class="pi pi-search text-xs" />
          <InputText
            v-model="busSearchQuery"
            placeholder="بحث برقم الأتوبيس أو اسم طالب..."
            class="w-full !text-xs !py-2"
          />
        </IconField>
      </div>
    </div>

    <!-- Bus Fleet Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <div
        v-for="bus in filteredBusCards"
        :key="bus.number"
        class="bg-white rounded-3xl shadow-sm border transition-all duration-200 overflow-hidden flex flex-col justify-between"
        :class="[
          bus.isOverLimit
            ? 'border-red-400 ring-2 ring-red-400/30'
            : bus.isFull 
              ? 'border-amber-300 ring-1 ring-amber-400/20' 
              : bus.familiesCount > 0 
                ? 'border-emerald-300 ring-1 ring-emerald-400/20' 
                : 'border-slate-200'
        ]"
      >
        <!-- Card Top Header -->
        <div class="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white">
          <div class="flex items-center justify-between">
            
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner font-mono"
                :class="[
                  bus.isOverLimit
                    ? 'bg-red-700 text-white shadow-red-700/40 animate-pulse'
                    : bus.isFull 
                      ? 'bg-amber-600 text-white' 
                      : bus.familiesCount > 0 
                        ? 'bg-emerald-600 text-white shadow-emerald-700/30' 
                        : 'bg-slate-200 text-slate-700'
                ]"
              >
                {{ bus.number }}
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">
                  أتوبيس رقم {{ bus.number }}
                </h3>
                <span class="text-xs text-slate-500 font-semibold">
                  سعة: {{ bus.maxFamilies }} عائلات / {{ bus.maxPersons }} فرد
                </span>
              </div>
            </div>

            <!-- Status Tag (متاح / مكتمل / تجاوز الحد) -->
            <div>
              <Tag
                v-if="bus.isOverLimit"
                value="تجاوز الحد"
                severity="danger"
                class="!px-3 !py-1 !text-xs !font-bold animate-pulse"
              />
              <Tag
                v-else-if="bus.isFull"
                value="مكتمل"
                severity="warn"
                class="!px-3 !py-1 !text-xs !font-bold"
              />
              <Tag
                v-else
                value="متاح"
                severity="success"
                class="!px-3 !py-1 !text-xs !font-bold"
              />
            </div>

          </div>
        </div>

        <!-- Card Body: Utilization Stats -->
        <div class="p-4 sm:p-5 space-y-3.5">
          <!-- Dual Category Invitation Counters (<= 4 and > 4) -->
          <div class="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
            <!-- Regular Families Counter (out of 7) -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[11px] font-bold">
                <span class="text-slate-600">≤ 4 دعوات:</span>
                <span
                  class="font-mono text-xs font-black"
                  :class="bus.regularFamiliesCount > bus.maxRegularFamilies ? 'text-red-600' : (bus.regularFamiliesCount >= bus.maxRegularFamilies ? 'text-amber-600' : 'text-emerald-700')"
                >
                  {{ bus.regularFamiliesCount }} / {{ bus.maxRegularFamilies }}
                </span>
              </div>
              <ProgressBar
                :value="Math.min(100, Math.round((bus.regularFamiliesCount / bus.maxRegularFamilies) * 100))"
                :showValue="false"
                class="!h-1.5 !bg-slate-200"
              />
            </div>

            <!-- Special Families Counter (out of 2) -->
            <div class="space-y-1 border-s border-slate-200 ps-2">
              <div class="flex items-center justify-between text-[11px] font-bold">
                <span class="text-purple-900">★ > 4 دعوات:</span>
                <span
                  class="font-mono text-xs font-black"
                  :class="bus.specialFamiliesCount > bus.maxSpecialFamilies ? 'text-red-600' : (bus.specialFamiliesCount >= bus.maxSpecialFamilies ? 'text-purple-900' : 'text-purple-700')"
                >
                  {{ bus.specialFamiliesCount }} / {{ bus.maxSpecialFamilies }}
                </span>
              </div>
              <ProgressBar
                :value="Math.min(100, Math.round((bus.specialFamiliesCount / bus.maxSpecialFamilies) * 100))"
                :showValue="false"
                class="!h-1.5 !bg-slate-200"
              />
            </div>
          </div>

          <!-- Total Families Progress -->
          <div>
            <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span class="flex items-center gap-1.5">
                <i class="pi pi-users text-slate-400"></i>
                إجمالي العائلات:
              </span>
              <span class="font-mono text-slate-900">
                <strong
                  class="text-sm font-black"
                  :class="bus.familiesCount > bus.maxFamilies ? 'text-red-600' : 'text-slate-800'"
                >
                  {{ bus.familiesCount }}
                </strong>
                / {{ bus.maxFamilies }} عائلة
              </span>
            </div>
            <ProgressBar
              :value="Math.min(100, Math.round((bus.familiesCount / bus.maxFamilies) * 100))"
              :showValue="false"
              class="!h-1.5 !bg-slate-100"
            />
          </div>

          <!-- Persons Progress -->
          <div>
            <div class="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span class="flex items-center gap-1.5">
                <i class="pi pi-user text-slate-400"></i>
                إشغال الأفراد:
              </span>
              <span class="font-mono text-slate-900">
                <strong
                  class="text-sm font-black"
                  :class="bus.isOverLimit ? 'text-red-600' : (bus.personsCount >= bus.maxPersons ? 'text-amber-600' : 'text-emerald-700')"
                >
                  {{ bus.personsCount }}
                </strong>
                / {{ bus.maxPersons }} فرد
              </span>
            </div>
            <ProgressBar
              :value="Math.min(100, Math.round((bus.personsCount / bus.maxPersons) * 100))"
              :showValue="false"
              class="!h-1.5 !bg-slate-100"
            />
          </div>
        </div>

        <!-- Card Footer & Actions -->
        <div class="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <Button
            :label="expandedBus === bus.number ? 'إخفاء القائمة' : `عرض الركاب (${bus.passengers.length})`"
            :icon="expandedBus === bus.number ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            size="small"
            severity="secondary"
            outlined
            class="!font-bold !text-xs"
            @click="toggleExpand(bus.number)"
          />

          <Button
            label="طباعة"
            icon="pi pi-print"
            size="small"
            class="!bg-emerald-600 !border-emerald-600 !text-white !font-bold !text-xs shadow-sm hover:!bg-emerald-700"
            :disabled="bus.passengers.length === 0"
            @click="openPrintDialog(bus.number)"
          />
        </div>

        <!-- Expanded Passengers List with student name bold/dark and family members indented -->
        <div
          v-if="expandedBus === bus.number"
          class="border-t border-slate-200 bg-white p-4 max-h-80 overflow-y-auto space-y-2.5 transition-all"
        >
          <div class="text-xs font-bold text-slate-500 flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
            <span>العائلات المسكنة ({{ bus.passengers.length }} عائلة):</span>
          </div>

          <div
            v-for="(passenger, idx) in bus.passengers"
            :key="passenger.military_number"
            class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition"
          >
            <div class="flex items-start gap-2.5 flex-1">
              <span class="text-xs font-bold font-mono text-slate-400 mt-0.5">
                #{{ idx + 1 }}
              </span>
              <div>
                <!-- Student Name in Bold Dark -->
                <div class="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap" style="font-weight: 800;">
                  <span>{{ passenger.name }}</span>
                  <span class="text-xs font-mono font-normal text-slate-500">({{ passenger.military_number }})</span>
                  <span
                    v-if="(passenger.families || []).length > 4"
                    class="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  >
                    ★ {{ (passenger.families || []).length }} دعوات
                  </span>
                  <span
                    v-else
                    class="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  >
                    {{ (passenger.families || []).length }} دعوات
                  </span>
                </div>
                <!-- Indented Family Members -->
                <div class="text-xs text-slate-600 font-semibold flex flex-wrap items-center gap-1.5 mt-1">
                  <span class="text-slate-400 font-bold">↳ المرافقين:</span>
                  <span
                    v-for="m in (passenger.families || []).filter(f => f.attended)"
                    :key="m.id"
                    class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold"
                  >
                    {{ m.name }} ({{ m.relation || 'مرافق' }})
                  </span>
                  <span
                    v-for="m in (passenger.families || []).filter(f => !f.attended)"
                    :key="'absent-' + m.id"
                    class="bg-red-50 text-red-700 border border-red-200 line-through px-1.5 py-0.5 rounded text-[10px]"
                    title="غائب / لم يحضر"
                  >
                    {{ m.name }} (غائب)
                  </span>
                  <span v-if="!passenger.families || passenger.families.filter(f => f.attended).length === 0" class="text-slate-400 italic text-[11px]">
                    (بدون مرافقين حاضرين)
                  </span>
                  <span class="text-slate-500 text-[11px] font-bold font-mono">
                    | الحاضرين بالأوتوبيس: {{ passenger.persons_count }} فرد
                  </span>
                </div>
              </div>
            </div>

            <!-- Action buttons: Move & Unseat -->
            <div class="flex items-center gap-1.5 ms-2">
              <Button
                label="نقل"
                icon="pi pi-arrow-right-arrow-left"
                size="small"
                severity="secondary"
                outlined
                class="!py-1 !px-2.5 !text-xs font-bold"
                :disabled="store.isWriteDisabled"
                title="نقل لأتوبيس آخر"
                @click="openMoveDialog(passenger)"
              />

              <Button
                icon="pi pi-times"
                size="small"
                severity="danger"
                text
                class="!p-1.5"
                :disabled="store.isWriteDisabled"
                title="إلغاء التسكين"
                @click="confirmUnseat(passenger)"
              />
            </div>
          </div>

          <div v-if="bus.passengers.length === 0" class="text-center py-5 text-xs text-slate-400 font-bold">
            لا توجد عائلات مسكنة في هذا الأتوبيس حالياً
          </div>
        </div>

      </div>
    </div>

    <!-- Modals -->
    <!-- Print Bus Dialog -->
    <PrintBusDialog
      v-model="showPrintDialog"
      :targetBusNumber="targetPrintBusNumber"
      @ready-to-print="handlePrintExecute"
    />

    <!-- Move Bus Dialog using unified BusPickerDialog -->
    <BusPickerDialog
      v-model="showMoveModal"
      :student="studentToMove"
      mode="move"
      @seated="handleMoveSuccess"
    />

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import PrintBusDialog from '../components/PrintBusDialog.vue';
import BusPickerDialog from '../components/BusPickerDialog.vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const store = useBusesStore();
const toast = useToast();
const confirm = useConfirm();

const expandedBus = ref(null);
const showPrintDialog = ref(false);
const targetPrintBusNumber = ref(null);

const showMoveModal = ref(false);
const studentToMove = ref(null);

const busStatusFilter = ref('all'); // 'all' | 'has_passengers' | 'full' | 'empty' | 'overlimit'
const busSearchQuery = ref('');

const emit = defineEmits(['trigger-print']);

const busCardsData = computed(() => {
  return store.buses.map(bus => {
    const passengers = store.students.filter(s => s.bus_number === bus.number);
    const familiesCount = passengers.length;
    let regularFamiliesCount = 0;
    let specialFamiliesCount = 0;
    let personsCount = 0;

    passengers.forEach(p => {
      personsCount += (p.persons_count || (1 + (p.families ? p.families.length : 0)));
      const memCount = (p.families || []).length;
      if (memCount > 4) {
        specialFamiliesCount++;
      } else {
        regularFamiliesCount++;
      }
    });

    const maxRegular = bus.maxRegularFamilies !== undefined ? bus.maxRegularFamilies : (store.settings.defaultMaxRegularFamilies || 7);
    const maxSpecial = bus.maxSpecialFamilies !== undefined ? bus.maxSpecialFamilies : (store.settings.defaultMaxSpecialFamilies || 2);

    const isFull = familiesCount >= bus.maxFamilies || personsCount >= bus.maxPersons || (regularFamiliesCount >= maxRegular && specialFamiliesCount >= maxSpecial);
    const isOverLimit = familiesCount > bus.maxFamilies || personsCount > bus.maxPersons || regularFamiliesCount > maxRegular || specialFamiliesCount > maxSpecial;

    return {
      number: bus.number,
      maxFamilies: bus.maxFamilies,
      maxPersons: bus.maxPersons,
      maxRegularFamilies: maxRegular,
      maxSpecialFamilies: maxSpecial,
      familiesCount,
      regularFamiliesCount,
      specialFamiliesCount,
      personsCount,
      passengers,
      isFull,
      isOverLimit
    };
  });
});

const filteredBusCards = computed(() => {
  return busCardsData.value.filter(bus => {
    // Status Filter
    if (busStatusFilter.value === 'available_regular' && bus.regularFamiliesCount >= bus.maxRegularFamilies) return false;
    if (busStatusFilter.value === 'available_special' && bus.specialFamiliesCount >= bus.maxSpecialFamilies) return false;
    if (busStatusFilter.value === 'has_passengers' && bus.familiesCount === 0) return false;
    if (busStatusFilter.value === 'full' && (!bus.isFull || bus.isOverLimit)) return false;
    if (busStatusFilter.value === 'empty' && bus.familiesCount > 0) return false;
    if (busStatusFilter.value === 'overlimit' && !bus.isOverLimit) return false;

    // Search query
    const q = busSearchQuery.value.trim().toLowerCase();
    if (q) {
      const matchBusNumber = String(bus.number) === q;
      const matchPassenger = bus.passengers.some(p => 
        String(p.name).toLowerCase().includes(q) ||
        String(p.military_number).includes(q) ||
        (p.families || []).some(m => String(m.name).toLowerCase().includes(q))
      );
      if (!matchBusNumber && !matchPassenger) return false;
    }

    return true;
  });
});

function toggleExpand(busNumber) {
  if (expandedBus.value === busNumber) {
    expandedBus.value = null;
  } else {
    expandedBus.value = busNumber;
  }
}

function openPrintDialog(busNumber = null) {
  targetPrintBusNumber.value = busNumber;
  showPrintDialog.value = true;
}

function openMoveDialog(passenger) {
  studentToMove.value = passenger;
  showMoveModal.value = true;
}

function handleMoveSuccess() {
  studentToMove.value = null;
}

function confirmUnseat(passenger) {
  confirm.require({
    header: 'تأكيد إخلاء المقعد',
    message: `هل أنت متأكد من إلغاء تسكين أسرة الطالب "${passenger.name}"؟`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'نعم، إخلاء المقعد',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.unseatFamily(passenger.military_number);
        toast.add({
          severity: 'info',
          summary: 'تم الإخلاء',
          detail: `تم إخلاء مقاعد أسرة الطالب ${passenger.name}`,
          life: 3000
        });
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: err.message || 'تعذر إخلاء المقاعد',
          life: 4000
        });
      }
    }
  });
}

function handlePrintExecute(printConfig) {
  emit('trigger-print', printConfig);
}
</script>
