<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="false"
    :style="{ width: '740px', maxWidth: '96vw' }"
    class="family-attendance-dialog rounded-3xl overflow-hidden shadow-2xl"
  >
    <div v-if="studentData" class="p-5 sm:p-6 space-y-5 max-h-[88vh] overflow-y-auto">
      
      <!-- Header with Student Info -->
      <div class="flex items-start justify-between border-b border-slate-200 pb-3">
        <div>
          <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mb-1">
            تسجيل حضور وتسكين أسرة الخريج
          </span>
          <h3 class="text-xl font-black text-slate-900">
            {{ studentData.name }}
          </h3>
          <div class="text-xs text-slate-500 font-mono mt-0.5">
            رقم الطالب: <strong class="text-slate-800">{{ studentData.number }}</strong>
          </div>
        </div>

        <button
          @click="visible = false"
          class="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          title="إغلاق"
        >
          <i class="pi pi-times text-base"></i>
        </button>
      </div>

      <!-- Current Bus Status Banner (if already seated) -->
      <div
        v-if="studentData.isSeated"
        class="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-emerald-700/20"
      >
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-black font-mono">
            {{ studentData.busNumber }}
          </div>
          <div>
            <div class="text-xs font-bold text-emerald-100">الأسرة مسكنة حالياً في</div>
            <div class="text-lg font-black">أتوبيس رقم ({{ studentData.busNumber }})</div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Button
            label="إلغاء التسكين وإخلاء المقاعد"
            icon="pi pi-undo"
            size="small"
            class="!bg-red-500/80 !border-transparent !text-white !text-xs !font-bold hover:!bg-red-600"
            @click="handleUnseat"
          />
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STEP 1: RECORD FAMILY MEMBERS ARRIVAL                    -->
      <!-- ======================================================== -->
      <div class="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">1</span>
              <h4 class="text-sm font-black text-slate-900">
                الخطوة الأولى: تسجيل حضور أفراد الأسرة
              </h4>
            </div>
            <p class="text-[11px] text-slate-500 font-semibold mt-0.5 ms-8">
              اضغط "تسجيل وصول الجميع" أو سجل حضور من وصل منهم بشكل منفرد
            </p>
          </div>

          <div class="flex items-center gap-2 ms-8 sm:ms-0">
            <!-- Mark All Arrived: Pure attendance, NO auto assignment! -->
            <Button
              label="تسجيل وصول الجميع (حضر الكل ✓)"
              icon="pi pi-check-circle"
              size="small"
              class="!bg-emerald-600 !border-emerald-600 !text-white !font-bold !text-xs shadow-sm hover:!bg-emerald-700"
              @click="handleMarkAllAttended"
            />

            <Button
              v-if="studentData.attendedCount > 0"
              label="إلغاء الحضور"
              icon="pi pi-refresh"
              size="small"
              severity="secondary"
              outlined
              class="!font-bold !text-xs"
              @click="handleUnmarkAll"
            />
          </div>
        </div>

        <!-- Attendance Counter Badge -->
        <div class="flex items-center justify-between px-1 text-xs">
          <span class="font-bold text-slate-700">
            قائمة الأسرة (حدد من وصل):
          </span>
          <span class="font-mono font-bold px-2 py-0.5 rounded-full" :class="studentData.attendedCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'">
            وصل {{ studentData.attendedCount }} من {{ studentData.totalMembersCount }} أفراد
          </span>
        </div>

        <!-- Family Members List -->
        <div v-if="studentData.members.length === 0" class="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300">
          <p class="text-xs font-bold text-slate-500">لا يوجد أفراد مسجلين لهذه الأسرة حتى الآن</p>
        </div>

        <div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
          <div
            v-for="(member, idx) in studentData.members"
            :key="member.id"
            class="p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3"
            :class="[
              member.attended
                ? 'bg-emerald-50/90 border-emerald-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs font-bold text-slate-400 w-4 text-center">
                {{ idx + 1 }}
              </span>
              <div>
                <div class="font-bold text-sm text-slate-900">
                  {{ member.name }}
                </div>
                <div class="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span class="bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px] text-slate-600 font-bold">
                    {{ member.relation || 'فرد أسرة' }}
                  </span>
                  <span v-if="member.attended" class="text-emerald-700 font-bold">
                    ✓ حضر ({{ formatArabicTime(member.attendedAt) }})
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Button
                :label="member.attended ? 'حضر / وصل ✓' : 'تسجيل حضور'"
                :icon="member.attended ? 'pi pi-check' : 'pi pi-user-plus'"
                size="small"
                :class="[
                  '!text-xs !font-bold transition-all',
                  member.attended
                    ? '!bg-emerald-600 !border-emerald-600 !text-white shadow-sm'
                    : '!bg-slate-100 !border-slate-300 !text-slate-700 hover:!bg-emerald-50 hover:!border-emerald-400 hover:!text-emerald-700'
                ]"
                @click="toggleAttendance(member)"
              />
              <button
                @click="removeMember(member.id)"
                class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="حذف هذا الفرد"
              >
                <i class="pi pi-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Add Member Form -->
        <div class="pt-1 flex gap-2">
          <InputText
            v-model="newMemberName"
            placeholder="إضافة فرد أسرة جديد..."
            class="flex-1 !text-xs font-bold"
            @keydown.enter="addNewMember"
          />
          <InputText
            v-model="newMemberRelation"
            placeholder="القرابة..."
            class="w-24 !text-xs font-bold"
            @keydown.enter="addNewMember"
          />
          <Button
            label="إضافة"
            icon="pi pi-plus"
            size="small"
            class="!bg-slate-800 !border-slate-800 !text-white !text-xs font-bold"
            @click="addNewMember"
          />
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- STEP 2: MANUALLY CHOOSE TARGET BUS                       -->
      <!-- ======================================================== -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
              <h4 class="text-sm font-black text-slate-900">
                الخطوة الثانية: اختيار الأتوبيس المطلوب لتسكين الأسرة (اختيار يدوي)
              </h4>
            </div>
            <p class="text-[11px] text-slate-500 font-semibold mt-0.5 ms-8">
              اضغط على الأتوبيس الذي تريده ليتم تحديده باللون الأخضر وعلامة (✓)
            </p>
          </div>

          <div v-if="selectedBusNumber" class="ms-8 sm:ms-0">
            <span class="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
              <i class="pi pi-check-circle text-emerald-600"></i>
              تم تحديد أتوبيس رقم {{ selectedBusNumber }}
            </span>
          </div>
        </div>

        <!-- Buses Grid (28 Buses): Click on ANY bus to select it! -->
        <div class="max-h-64 overflow-y-auto p-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            v-for="bus in busOptions"
            :key="bus.number"
            @click="selectBus(bus.number)"
            class="p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer select-none relative"
            :class="[
              selectedBusNumber === bus.number
                ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-4 ring-emerald-500/20 scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
            ]"
          >
            <!-- Checkmark badge if selected -->
            <div
              v-if="selectedBusNumber === bus.number"
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white"
            >
              ✓
            </div>

            <!-- Bus Number Icon -->
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-lg mx-auto mb-2 transition-colors"
              :class="selectedBusNumber === bus.number ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'"
            >
              {{ bus.number }}
            </div>
            
            <div class="text-xs font-black text-slate-900">
              أتوبيس رقم {{ bus.number }}
            </div>

            <div class="text-[11px] font-semibold text-slate-600 mt-1">
              {{ bus.currentPersons }}/{{ bus.maxPersons }} فرد
            </div>

            <div class="text-[10px] text-slate-400 font-semibold">
              {{ bus.currentFamilies }}/{{ bus.maxFamilies }} أسر
            </div>

            <!-- Status Badges -->
            <div class="mt-2">
              <span
                v-if="selectedBusNumber === bus.number"
                class="text-[10px] block font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm"
              >
                ✓ محدد للتسكين
              </span>
              <span
                v-else-if="bus.isCurrentBus"
                class="text-[10px] block font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200"
              >
                الأتوبيس الحالي
              </span>
              <span
                v-else-if="bus.willExceed"
                class="text-[10px] block font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300"
              >
                ⚠️ سيتجاوز السعة
              </span>
              <span
                v-else
                class="text-[10px] block font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
              >
                متاح
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- STEP 3: PROMINENT CONFIRMATION BUTTON                    -->
      <!-- ======================================================== -->
      <div class="pt-2">
        
        <!-- Case 1: No members attended yet -->
        <Button
          v-if="studentData.attendedCount === 0"
          disabled
          label="⚠️ سجل حضور فرد واحد على الأقل أولاً لتتمكن من اختيار وتسكين الأتوبيس"
          icon="pi pi-exclamation-circle"
          class="w-full !py-3.5 !font-black !text-sm !bg-slate-200 !text-slate-500 !border-slate-300 cursor-not-allowed"
        />

        <!-- Case 2: Members attended, but no bus selected yet -->
        <Button
          v-else-if="!selectedBusNumber"
          disabled
          label="👈 اضغط على أحد الأتوبيسات من المربعات أعلاه لتحديده أولاً"
          icon="pi pi-hand-point-up"
          class="w-full !py-3.5 !font-black !text-sm !bg-amber-100 !text-amber-900 !border-amber-300 cursor-not-allowed"
        />

        <!-- Case 3: Ready to confirm seating! -->
        <Button
          v-else
          :label="`تأكيد تسكين الأسرة في أتوبيس رقم (${selectedBusNumber}) الآن 🚌`"
          icon="pi pi-check"
          class="w-full !py-4 !font-black !text-base !bg-emerald-600 !border-emerald-600 !text-white hover:!bg-emerald-700 shadow-xl shadow-emerald-700/25 transition-all transform active:scale-[0.99]"
          @click="confirmSeating"
        />

      </div>

      <!-- Footer Dialog Controls -->
      <div class="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-400 font-semibold">
          منظومة تسكين أسر الخريجين — اختيار يدوي مرن 100%
        </span>
        <Button
          label="إلغاء وإغلاق"
          severity="secondary"
          outlined
          size="small"
          class="!font-bold text-xs"
          @click="visible = false"
        />
      </div>

    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { formatArabicTime } from '../utils/arabicUtils.js';
import { playSuccessSound } from '../utils/audioUtils.js';
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

const emit = defineEmits(['update:modelValue', 'seated', 'change-bus']);

const store = useBusesStore();
const toast = useToast();

const visible = ref(props.modelValue);
const selectedBusNumber = ref(null);
const newMemberName = ref('');
const newMemberRelation = ref('');

// Computed student record
const studentData = computed(() => {
  if (!props.studentNumber) return null;
  return store.studentsWithFamily.find(s => String(s.number) === String(props.studentNumber));
});

// Sync visibility and initialize selected bus
watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val && studentData.value) {
    selectedBusNumber.value = studentData.value.busNumber ? Number(studentData.value.busNumber) : null;
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

watch(() => props.studentNumber, (val) => {
  if (val && studentData.value) {
    selectedBusNumber.value = studentData.value.busNumber ? Number(studentData.value.busNumber) : null;
  } else {
    selectedBusNumber.value = null;
  }
}, { immediate: true });

// Bus options with occupancy and capacity warnings
const busOptions = computed(() => {
  if (!studentData.value) return [];
  const familyPersons = studentData.value.attendedCount > 0
    ? studentData.value.attendedCount
    : studentData.value.totalMembersCount;

  return store.buses.map(bus => {
    const isCurrentBus = Number(studentData.value.busNumber) === Number(bus.number);
    const currentFamilies = store.busFamilies(bus.number).length;
    const currentPersons = store.busPersons(bus.number);

    const projectedFamilies = currentFamilies + (isCurrentBus ? 0 : 1);
    const projectedPersons = currentPersons + (isCurrentBus ? 0 : familyPersons);

    const willExceed = (
      projectedFamilies > bus.maxFamilies ||
      projectedPersons > bus.maxPersons
    );

    return {
      number: bus.number,
      maxFamilies: bus.maxFamilies,
      maxPersons: bus.maxPersons,
      currentFamilies,
      currentPersons,
      willExceed,
      isCurrentBus
    };
  });
});

/**
 * Step 2: Operator selects which bus they want manually
 */
function selectBus(busNumber) {
  selectedBusNumber.value = Number(busNumber);
}

/**
 * Step 1: Toggle individual member attendance
 */
function toggleAttendance(member) {
  const newStatus = !member.attended;
  const res = store.setMemberAttendance(member.id, newStatus);

  if (res.success) {
    if (newStatus) {
      playSuccessSound();
      toast.add({
        severity: 'success',
        summary: 'تم تسجيل الحضور',
        detail: `تم تأكيد وصول ${member.name}. اختر الأتوبيس واضغط زر التأكيد.`,
        life: 2500
      });
    } else {
      toast.add({
        severity: 'info',
        summary: 'إلغاء الحضور',
        detail: `تم إلغاء حضور ${member.name}`,
        life: 2000
      });
    }
  }
}

/**
 * Step 1: Mark all family members as arrived (PURE ATTENDANCE, NO AUTO SEATING!)
 */
function handleMarkAllAttended() {
  if (!studentData.value) return;
  const res = store.markAllFamilyMembersAttended(studentData.value.number);

  if (res.success) {
    playSuccessSound();
    toast.add({
      severity: 'success',
      summary: 'تم تأكيد وصول الجميع',
      detail: 'تم تسجيل حضور جميع أفراد الأسرة! الآن اختر الأتوبيس المطلوب من المربعات بالأسفل.',
      life: 3000
    });
  }
}

/**
 * Step 1: Unmark all family members
 */
function handleUnmarkAll() {
  if (!studentData.value) return;
  store.unmarkAllFamilyMembersAttended(studentData.value.number);
  selectedBusNumber.value = null;
  toast.add({
    severity: 'info',
    summary: 'تم الإلغاء',
    detail: 'تم إلغاء حضور أفراد الأسرة وإخلاء الأتوبيس',
    life: 2500
  });
}

/**
 * Step 3: Explicitly confirm seating in the selected bus
 */
function confirmSeating() {
  if (!studentData.value || !selectedBusNumber.value) return;
  if (studentData.value.attendedCount === 0) {
    toast.add({
      severity: 'warn',
      summary: 'تنبيه',
      detail: 'يرجى تسجيل حضور فرد واحد على الأقل لتسكين الأسرة',
      life: 3000
    });
    return;
  }

  const busNum = Number(selectedBusNumber.value);
  const res = store.assignFamilyToBus(studentData.value.number, busNum);

  if (res.success) {
    playSuccessSound();

    if (res.exceedsLimit) {
      toast.add({
        severity: 'warn',
        summary: '⚠️ تحذير: تجاوز سعة الأتوبيس',
        detail: `تحذير: لقد تجاوزت سعة الأتوبيس المسموح بها في أتوبيس رقم (${busNum})! يرجى نقل بعض الركاب إلى أتوبيس آخر لأنك تخطيت الحد الأقصى.`,
        life: 8000
      });
    } else {
      toast.add({
        severity: 'success',
        summary: 'تم التسكين بنجاح',
        detail: `تم تسكين أسرة الطالب في أتوبيس رقم (${busNum}) بنجاح`,
        life: 3500
      });
    }

    visible.value = false;

    // Trigger Big Bus modal popup
    emit('seated', {
      studentNumber: props.studentNumber,
      busNumber: busNum
    });
  }
}

/**
 * Unseat family from bus
 */
function handleUnseat() {
  if (!studentData.value) return;
  const res = store.unassignFamilyFromBus(studentData.value.number);
  if (res.success) {
    selectedBusNumber.value = null;
    toast.add({
      severity: 'info',
      summary: 'تم إلغاء التسكين',
      detail: `تم إخلاء المقاعد من أتوبيس رقم (${res.previousBus})`,
      life: 3000
    });
  }
}

/**
 * Quick add new family member
 */
function addNewMember() {
  const name = newMemberName.value.trim();
  if (!name || !studentData.value) return;

  store.addFamilyMember(studentData.value.number, {
    name,
    relation: newMemberRelation.value.trim() || 'فرد أسرة'
  });

  newMemberName.value = '';
  newMemberRelation.value = '';
  toast.add({
    severity: 'success',
    summary: 'تمت الإضافة',
    detail: `تمت إضافة ${name} إلى أسرة الطالب`,
    life: 2500
  });
}

/**
 * Remove a family member
 */
function removeMember(memberId) {
  store.removeFamilyMember(memberId);
  toast.add({
    severity: 'info',
    summary: 'تم الحذف',
    detail: 'تم حذف فرد الأسرة',
    life: 2000
  });
}
</script>
