<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="false"
    :style="{ width: '840px', maxWidth: '96vw' }"
    class="bus-picker-dialog rounded-3xl overflow-hidden shadow-2xl"
    @hide="onClose"
  >
    <div v-if="student" class="p-6 space-y-5 max-h-[90vh] flex flex-col">
      
      <!-- Header: Title, Student Name, Persons Count -->
      <div class="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 mb-2">
            <i class="pi pi-car"></i>
            <span>{{ isMoveMode ? 'نقل العائلة لأتوبيس آخر' : 'تسجيل الحضور واختيار الأتوبيس' }}</span>
          </div>
          <h3 class="text-2xl font-black text-slate-900 flex items-center gap-3">
            <span>{{ student.name }}</span>
            <span class="text-sm font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
              رقم: {{ student.military_number }}
            </span>
          </h3>

          <!-- Student invitation category badge -->
          <div class="mt-2 flex items-center gap-2">
            <span
              v-if="(student.families || []).length > 4"
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold shadow-xs"
            >
              <i class="pi pi-star-fill text-[11px] text-purple-600"></i>
              <span>فئة دعوات خاصة (★ {{ (student.families || []).length }} دعوات — يحجز من عداد الـ 2 بالأوتوبيس)</span>
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <span>فئة عادية ({{ (student.families || []).length }} دعوات — يحجز من عداد الـ 7 بالأوتوبيس)</span>
            </span>
          </div>
        </div>

        <!-- Family persons pill -->
        <div class="text-center bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-md">
          <span class="text-xs text-slate-400 block font-bold">الحاضرين للأتوبيس</span>
          <span class="text-xl font-black text-emerald-400 font-mono">{{ familyPersonsCount }} فرد</span>
          <span class="text-[10px] text-slate-400 block">طالب + {{ checkedMembersCount }} مرافقين حاضرين</span>
        </div>
      </div>

      <!-- Auto Seating Info Banner (when enabled in settings) -->
      <div
        v-if="store.settings.autoSeating && !isMoveMode"
        class="bg-amber-50 border border-amber-300 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs"
      >
        <div class="flex items-center gap-2 text-xs font-bold text-amber-950">
          <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <i class="pi pi-bolt"></i>
          </div>
          <span>
            وضع التسكين التلقائي مفعل: سيتم تسكين الأسرة في 
            <span class="text-emerald-700 font-black text-sm underline ms-1">
              أتوبيس رقم {{ selectedBus || '—' }}
            </span>
            فور اكتمال الحضور.
          </span>
        </div>

        <Button
          v-if="!allMembersArrived"
          label="حضور وتسكين فوري ⚡"
          icon="pi pi-bolt"
          size="small"
          class="!bg-amber-600 !border-amber-600 !text-white !text-xs !font-bold shadow-sm hover:!bg-amber-700 shrink-0"
          @click="markAllAndAutoConfirm"
        />
      </div>

      <!-- ======================================================== -->
      <!-- FAMILY ATTENDANCE CHECKLIST                              -->
      <!-- ======================================================== -->
      <div v-if="!isMoveMode" class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
              <h4 class="text-xs sm:text-sm font-black text-slate-900">
                تسجيل حضور أفراد الأسرة الواصلين ({{ checkedMembersCount }} من {{ totalMembersCount }})
              </h4>
            </div>
            <p class="text-[11px] text-slate-500 font-semibold mt-0.5 ms-7">
              حدد من وصل فقط. في حال عدم حضور أي فرد يمكنك تركه دون تحديد وسيتم تسكين الحاضرين فقط وحجز مقاعدهم.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2 ms-7 sm:ms-0">
            <Button
              v-if="!allMembersArrived"
              label="حضور الجميع (الكل وصل ✓)"
              icon="pi pi-check-circle"
              size="small"
              class="!bg-emerald-600 !border-emerald-600 !text-white !text-xs !font-bold shadow-sm hover:!bg-emerald-700"
              @click="markAllMembers(true)"
            />
            <Button
              v-else
              label="إلغاء تحديد الكل"
              icon="pi pi-refresh"
              size="small"
              severity="secondary"
              outlined
              class="!text-xs !font-bold"
              @click="markAllMembers(false)"
            />
          </div>
        </div>

        <!-- Members Checkbox Cards -->
        <div v-if="memberList.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div
            v-for="m in memberList"
            :key="m.id"
            @click="toggleMember(m.id)"
            :class="[
              'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none',
              m.checked
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
            ]"
          >
            <div class="flex items-center gap-3">
              <!-- Checkbox Element -->
              <input
                type="checkbox"
                :checked="m.checked"
                class="w-5 h-5 rounded cursor-pointer accent-emerald-600 text-emerald-600 focus:ring-emerald-500 pointer-events-none"
              />

              <div>
                <span class="font-bold text-xs text-slate-900 block">{{ m.name }}</span>
                <span class="text-[10px] text-slate-500 block">
                  القرابة: <strong>{{ m.relation || 'مرافق' }}</strong>
                  <span v-if="m.national_id" class="font-mono ms-1">| {{ m.national_id }}</span>
                </span>
              </div>
            </div>

            <!-- Attendance Tag -->
            <Tag
              :value="m.checked ? '✓ حضر' : 'لم يحضر'"
              :severity="m.checked ? 'success' : 'secondary'"
              class="!text-[10px] !font-bold !px-2 !py-0.5"
            />
          </div>
        </div>

        <!-- In case student has 0 family members registered -->
        <div v-else class="text-xs text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200 text-center">
          الطالب مسجل بدون مرافقين (حضور فردي).
        </div>

        <!-- Attendance Status Alert -->
        <div
          v-if="!allMembersArrived && memberList.length > 0"
          class="bg-amber-50 border border-amber-300/80 p-2.5 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2"
        >
          <i class="pi pi-exclamation-triangle text-amber-600 text-sm"></i>
          <span>زر "تأكيد التسجيل" معطل حتى يتم تأكيد حضور جميع أفراد الأسرة (متبقي {{ totalMembersCount - checkedMembersCount }} أفراد).</span>
        </div>

        <div
          v-else-if="allMembersArrived"
          class="bg-emerald-50 border border-emerald-300/80 p-2.5 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2"
        >
          <i class="pi pi-check-circle text-emerald-600 text-sm"></i>
          <span>اكتمل حضور جميع أفراد الأسرة بنجاح ✓ يمكنك الآن اختيار الأتوبيس وتأكيد التسكين.</span>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STEP 2: BUS SELECTION CARDS                              -->
      <!-- ======================================================== -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-slate-700 font-bold">
          <span class="flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center">2</span>
            <span>اختر الأتوبيس المطلوب:</span>
          </span>
          <span v-if="selectedBus" class="text-emerald-700 font-bold">
            الأتوبيس المحدد: رقم {{ selectedBus }}
          </span>
        </div>

        <!-- Bus Cards Grid -->
        <div class="overflow-y-auto pe-1 max-h-[35vh] space-y-2.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="bus in enrichedBuses"
              :key="bus.number"
              @click="!bus.isDisabled && selectBus(bus.number)"
              :class="[
                'p-3.5 rounded-2xl border-2 transition-all duration-150 relative select-none',
                bus.isDisabled
                  ? 'opacity-50 bg-slate-100/80 border-slate-200 cursor-not-allowed'
                  : selectedBus === bus.number
                    ? 'border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/30 cursor-pointer scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer shadow-xs'
              ]"
            >
              <!-- Card Top: Bus number & Status Tag -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5">
                  <div
                    :class="[
                      'w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-base transition-colors',
                      selectedBus === bus.number && !bus.isDisabled
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30'
                        : bus.isDisabled
                          ? 'bg-slate-300 text-slate-600'
                          : 'bg-slate-800 text-white'
                    ]"
                  >
                    {{ bus.number }}
                  </div>
                  <div>
                    <span class="font-bold text-xs sm:text-sm text-slate-900 block">
                      أتوبيس رقم {{ bus.number }}
                    </span>
                    <span class="text-[10px] text-slate-500 block">
                      السعة: {{ bus.maxFamilies }} عائلات / {{ bus.maxPersons }} فرد
                    </span>
                  </div>
                </div>

                <!-- Status Tag -->
                <div>
                  <Tag
                    v-if="bus.isCurrentBus"
                    value="الأتوبيس الحالي"
                    severity="secondary"
                    class="!text-[10px] !font-bold"
                  />
                  <Tag
                    v-else-if="bus.isDisabled"
                    :value="bus.disableReason"
                    severity="danger"
                    class="!text-[10px] !font-bold"
                  />
                  <Tag
                    v-else-if="bus.isFull"
                    value="مكتمل"
                    severity="warn"
                    class="!text-[10px] !font-bold"
                  />
                  <Tag
                    v-else
                    value="متاح"
                    severity="success"
                    class="!text-[10px] !font-bold"
                  />
                </div>
              </div>

              <!-- Category Counters: <= 4 and > 4 -->
              <div class="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold mb-2">
                <div class="flex items-center justify-between">
                  <span class="text-slate-600">≤ 4 دعوات:</span>
                  <span class="font-mono text-xs font-black" :class="bus.regularFamiliesCount >= bus.maxRegularFamilies ? 'text-amber-600' : 'text-emerald-700'">
                    {{ bus.regularFamiliesCount }}/{{ bus.maxRegularFamilies }}
                  </span>
                </div>
                <div class="flex items-center justify-between border-s border-slate-200 ps-1.5">
                  <span class="text-purple-900">★ > 4:</span>
                  <span class="font-mono text-xs font-black" :class="bus.specialFamiliesCount >= bus.maxSpecialFamilies ? 'text-purple-900' : 'text-purple-700'">
                    {{ bus.specialFamiliesCount }}/{{ bus.maxSpecialFamilies }}
                  </span>
                </div>
              </div>

              <!-- Card Bottom: Counts & Progress Bars -->
              <div class="space-y-1.5 text-xs">
                <!-- Families Progress -->
                <div>
                  <div class="flex justify-between items-center text-slate-600 mb-0.5">
                    <span class="font-bold text-[10px]">إجمالي العائلات:</span>
                    <span class="font-mono font-bold text-[11px]">
                      {{ bus.familiesCount }} / {{ bus.maxFamilies }}
                    </span>
                  </div>
                  <ProgressBar
                    :value="Math.min(100, Math.round((bus.familiesCount / bus.maxFamilies) * 100))"
                    :showValue="false"
                    class="!h-1.5"
                  />
                </div>

                <!-- Persons Progress -->
                <div>
                  <div class="flex justify-between items-center text-slate-600 mb-0.5">
                    <span class="font-bold text-[10px]">الأفراد:</span>
                    <span class="font-mono font-bold text-[11px]">
                      {{ bus.personsCount }} / {{ bus.maxPersons }}
                    </span>
                  </div>
                  <ProgressBar
                    :value="Math.min(100, Math.round((bus.personsCount / bus.maxPersons) * 100))"
                    :showValue="false"
                    class="!h-1.5"
                  />
                </div>
              </div>

              <!-- Check badge -->
              <div
                v-if="selectedBus === bus.number && !bus.isDisabled"
                class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-sm"
              >
                <i class="pi pi-check"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button
          label="إلغاء (Esc)"
          icon="pi pi-times"
          severity="secondary"
          outlined
          class="!font-bold !text-xs sm:text-sm !py-2.5 !px-5"
          :disabled="submitting"
          @click="visible = false"
        />

        <!-- Confirm Seating: Enabled as long as a valid bus is selected (partial attendance allowed) -->
        <Button
          :label="submitting ? 'جاري التأكيد...' : (isMoveMode ? `تأكيد النقل إلى أتوبيس (${selectedBus || '...'})` : (store.settings.autoSeating ? `تأكيد التسكين التلقائي (أتوبيس ${selectedBus || '...'})` : `تأكيد تسكين الحاضرين (${familyPersonsCount} فرد) في أتوبيس (${selectedBus || '...'})`))"
          icon="pi pi-check"
          :class="[
            '!font-bold !text-sm sm:!text-base !py-3 !px-8 shadow-lg transition-all',
            canConfirm
              ? '!bg-emerald-600 !border-emerald-600 !text-white shadow-emerald-700/20 hover:!bg-emerald-700 cursor-pointer'
              : '!bg-slate-300 !border-slate-300 !text-slate-500 opacity-40 cursor-not-allowed shadow-none'
          ]"
          :disabled="!canConfirm"
          :loading="submitting"
          @click="confirmSeating"
        />
      </div>

    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  student: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'seat' // 'seat' | 'move'
  }
});

const emit = defineEmits(['update:modelValue', 'seated']);

const store = useBusesStore();
const toast = useToast();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isMoveMode = computed(() => props.mode === 'move');
const selectedBus = ref(null);
const submitting = ref(false);

// Family Members checklist state
const memberList = ref([]);

const totalMembersCount = computed(() => memberList.value.length);
const checkedMembersCount = computed(() => memberList.value.filter(m => m.checked).length);

const allMembersArrived = computed(() => {
  if (memberList.value.length === 0) return true;
  return memberList.value.every(m => m.checked);
});

// Total persons boarding the bus: 1 (student) + checked family members
const familyPersonsCount = computed(() => {
  return 1 + checkedMembersCount.value;
});

// Can confirm when an available bus is selected (partial attendance is completely allowed)
const canConfirm = computed(() => {
  if (submitting.value || store.isWriteDisabled) return false;
  if (!selectedBus.value || isSelectedBusDisabled.value) return false;
  return true;
});

// Calculate bus status and disable reasons
const enrichedBuses = computed(() => {
  const currentBus = props.student?.bus_number;
  const pCount = familyPersonsCount.value;
  const isStudentSpecial = (props.student?.families || []).length > 4;

  return store.buses.map(bus => {
    const isCurrent = currentBus === bus.number;
    
    // If moving within the same bus, exclude own count
    const effectiveFamilies = (isMoveMode.value && isCurrent)
      ? Math.max(0, bus.familiesCount - 1)
      : bus.familiesCount;

    const effectivePersons = (isMoveMode.value && isCurrent)
      ? Math.max(0, bus.personsCount - pCount)
      : bus.personsCount;

    const maxRegular = bus.maxRegularFamilies !== undefined ? bus.maxRegularFamilies : (store.settings.defaultMaxRegularFamilies || 7);
    const maxSpecial = bus.maxSpecialFamilies !== undefined ? bus.maxSpecialFamilies : (store.settings.defaultMaxSpecialFamilies || 2);

    const effectiveRegular = (isMoveMode.value && isCurrent && !isStudentSpecial)
      ? Math.max(0, (bus.regularFamiliesCount || 0) - 1)
      : (bus.regularFamiliesCount || 0);

    const effectiveSpecial = (isMoveMode.value && isCurrent && isStudentSpecial)
      ? Math.max(0, (bus.specialFamiliesCount || 0) - 1)
      : (bus.specialFamiliesCount || 0);

    const exceedFamilies = effectiveFamilies + 1 > bus.maxFamilies;
    const exceedPersons = effectivePersons + pCount > bus.maxPersons;
    const exceedCategory = isStudentSpecial
      ? (effectiveSpecial + 1 > maxSpecial)
      : (effectiveRegular + 1 > maxRegular);

    let isDisabled = false;
    let disableReason = '';

    if (isMoveMode.value && isCurrent) {
      isDisabled = true;
      disableReason = 'الأتوبيس الحالي';
    } else if (exceedCategory) {
      isDisabled = true;
      disableReason = isStudentSpecial
        ? `اكتمل حد عائلات > 4 دعوات (${maxSpecial}/${maxSpecial})`
        : `اكتمل حد عائلات ≤ 4 دعوات (${maxRegular}/${maxRegular})`;
    } else if (exceedFamilies) {
      isDisabled = true;
      disableReason = 'اكتمل عدد العائلات';
    } else if (exceedPersons) {
      isDisabled = true;
      disableReason = 'لا يتسع لعدد أفراد هذه العائلة';
    }

    return {
      ...bus,
      maxRegularFamilies: maxRegular,
      maxSpecialFamilies: maxSpecial,
      regularFamiliesCount: bus.regularFamiliesCount || 0,
      specialFamiliesCount: bus.specialFamiliesCount || 0,
      isCurrentBus: isCurrent,
      isDisabled,
      disableReason,
      isFull: bus.familiesCount >= bus.maxFamilies || bus.personsCount >= bus.maxPersons || (effectiveRegular >= maxRegular && effectiveSpecial >= maxSpecial)
    };
  });
});

const isSelectedBusDisabled = computed(() => {
  if (!selectedBus.value) return true;
  const target = enrichedBuses.value.find(b => b.number === selectedBus.value);
  return target ? target.isDisabled : true;
});

// Initialize selection & family checklist when dialog opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    store.refreshState(true);

    // Initialize checklist of family members (checked by default or preserving previous status)
    const families = props.student?.families || [];
    memberList.value = families.map((f, idx) => ({
      id: f.id || idx,
      name: f.name || '',
      relation: f.relation || '',
      national_id: f.national_id || '',
      checked: isMoveMode.value ? (f.attended !== false && f.attended !== 0) : true
    }));

    // Pre-select first available bus if autoSeating is enabled and not move mode
    if (store.settings.autoSeating && !isMoveMode.value) {
      const firstAvailable = enrichedBuses.value.find(b => !b.isDisabled);
      selectedBus.value = firstAvailable ? firstAvailable.number : null;
    } else {
      // Start with NO bus selected so user must pick explicitly
      selectedBus.value = null;
    }
  }
});

// Watch enrichedBuses if dialog is open with autoSeating and no bus selected yet
watch(() => enrichedBuses.value, (newBuses) => {
  if (visible.value && store.settings.autoSeating && !isMoveMode.value && !selectedBus.value) {
    const firstAvailable = newBuses.find(b => !b.isDisabled);
    if (firstAvailable) {
      selectedBus.value = firstAvailable.number;
    }
  }
});

function markAllAndAutoConfirm() {
  markAllMembers(true);
  if (!selectedBus.value) {
    const firstAvailable = enrichedBuses.value.find(b => !b.isDisabled);
    if (firstAvailable) {
      selectedBus.value = firstAvailable.number;
    }
  }
  if (canConfirm.value) {
    confirmSeating();
  }
}

function toggleMember(id) {
  const m = memberList.value.find(item => item.id === id);
  if (m) {
    m.checked = !m.checked;
  }
}

function markAllMembers(status) {
  memberList.value.forEach(m => {
    m.checked = status;
  });
}

function selectBus(num) {
  selectedBus.value = num;
}

function onClose() {
  submitting.value = false;
}

// Keyboard navigation (Enter confirms ONLY IF canConfirm is true)
function handleKeydown(e) {
  if (!visible.value) return;

  if (e.key === 'Escape') {
    visible.value = false;
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (canConfirm.value) {
      confirmSeating();
    }
    return;
  }

  // Arrow keys navigation
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    navigateSelection(1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    navigateSelection(-1);
  }
}

function navigateSelection(step) {
  const list = enrichedBuses.value;
  if (!list.length) return;

  const currentIdx = list.findIndex(b => b.number === selectedBus.value);
  let nextIdx = (currentIdx + step + list.length) % list.length;

  for (let i = 0; i < list.length; i++) {
    const candidate = list[nextIdx];
    if (!candidate.isDisabled) {
      selectedBus.value = candidate.number;
      break;
    }
    nextIdx = (nextIdx + step + list.length) % list.length;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

async function confirmSeating() {
  if (!canConfirm.value) return;

  submitting.value = true;
  try {
    const attendedMemberIds = memberList.value.filter(m => m.checked).map(m => m.id);

    if (isMoveMode.value) {
      await store.moveFamily(props.student.military_number, selectedBus.value, attendedMemberIds);
      toast.add({
        severity: 'success',
        summary: 'تم النقل بنجاح',
        detail: `تم نقل أسرة الطالب ${props.student.name} (${familyPersonsCount.value} فرد) إلى أتوبيس رقم ${selectedBus.value}`,
        life: 4000
      });
    } else {
      await store.seatFamily(props.student.military_number, selectedBus.value, attendedMemberIds);
      toast.add({
        severity: 'success',
        summary: 'تم تسجيل الحضور والتسكين',
        detail: `تم تأكيد حضور الأسرة (${familyPersonsCount.value} فرد) وتسكينهم في أتوبيس رقم ${selectedBus.value}`,
        life: 4000
      });
    }

    emit('seated', {
      studentNumber: props.student.military_number,
      studentName: props.student.name,
      busNumber: selectedBus.value,
      totalPersons: familyPersonsCount.value
    });

    visible.value = false;
  } catch (err) {
    console.error('Seating error:', err);
    toast.add({
      severity: 'error',
      summary: 'تعذر التسكين',
      detail: err.message || 'حدث خطأ في السيرفر',
      life: 5000
    });
    if (err.code === 'BUS_FULL') {
      await store.refreshState(true);
    }
  } finally {
    submitting.value = false;
  }
}
</script>
