<template>
  <div class="print-container">
    <div
      v-for="bus in printBuses"
      :key="bus.number"
      class="print-page"
      dir="rtl"
    >
      <!-- Top Title -->
      <div class="print-header">
        <div class="flex justify-between items-center border-b-2 border-black pb-3 mb-3">
          <div>
            <h1 class="text-2xl font-black text-black">
              منظومة الأتوبيسات — حفل التخرج
            </h1>
            <p class="text-xs text-gray-700 font-bold">
              كشف ركاب وتوزيع أسر الطلاب
            </p>
          </div>

          <div class="border-2 border-black px-6 py-2 rounded-xl text-center bg-gray-50">
            <span class="text-2xl font-black block text-black">
              أتوبيس رقم {{ bus.number }}
            </span>
          </div>
        </div>

        <!-- Manager, Driver, Security, Date -->
        <div class="grid grid-cols-4 gap-2 text-xs border border-black p-2.5 rounded-lg bg-gray-50 mb-4">
          <div>
            <span class="text-gray-600 block font-bold">قائد المأمورية :</span>
            <span class="font-bold text-black text-sm">{{ staffData.manager || '—' }}</span>
          </div>

      
        </div>
      </div>

      <!-- Passengers Table -->
      <div class="print-body flex-1">
        <table class="w-full border-collapse border border-black text-xs">
          <thead>
            <tr class="bg-gray-100 border-b border-black">
              <th class="border border-black p-2 text-center" style="width: 6%;">م</th>
              <th class="border border-black p-2 text-right" style="width: 44%;">الاسم</th>
              <th class="border border-black p-2 text-center" style="width: 18%;">صلة القرابة</th>
              <th class="border border-black p-2 text-center" style="width: 16%;">الرقم القومي</th>
              <th class="border border-black p-2 text-center" style="width: 16%;">التوقيع / ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(student, sIdx) in bus.seatedStudents" :key="student.military_number">
              <!-- STUDENT NAME: Dark/bold, font-weight 800, #000, slightly larger, light gray background -->
              <tr class="bg-gray-200 border-t-2 border-b border-black">
                <td class="border border-black p-2 text-center font-black font-mono">
                  {{ sIdx + 1 }}
                </td>
                <td colspan="4" class="border border-black p-2">
                  <div class="flex items-center justify-between">
                    <span class="font-[800] text-black text-sm">
                      🎓 الطالب: {{ student.name }}
                    </span>
                    <span class="text-xs font-mono text-gray-800">
                      رقم عسكري: {{ student.military_number }} | الحاضرين بالأتوبيس: {{ student.persons_count }} فرد
                    </span>
                  </div>
                </td>
              </tr>

              <!-- FAMILY MEMBERS: Only members who attended appear in the bus printout! -->
              <tr
                v-for="(member, mIdx) in (student.families || []).filter(m => m.attended)"
                :key="member.id || mIdx"
                class="border-b border-gray-300"
              >
                <td class="border border-black p-1.5 text-center font-mono text-gray-500">
                  {{ sIdx + 1 }}.{{ mIdx + 1 }}
                </td>
                <td class="border border-black p-1.5 pr-6 font-normal text-gray-900">
                  • {{ member.name }}
                </td>
                <td class="border border-black p-1.5 text-center font-normal text-gray-700">
                  {{ member.relation || 'فرد أسرة' }}
                </td>
                <td class="border border-black p-1.5 text-center font-mono text-gray-600">
                  {{ member.national_id || '—' }}
                </td>
                <td class="border border-black p-1.5 text-center text-gray-400">
                  ........................
                </td>
              </tr>

              <!-- If student came alone or no family members attended -->
              <tr v-if="!student.families || student.families.filter(m => m.attended).length === 0" class="border-b border-gray-300">
                <td class="border border-black p-1 text-center text-gray-400">—</td>
                <td colspan="4" class="border border-black p-1.5 pr-6 text-gray-500 italic text-[11px]">
                  (حضور فردي للطالب فقط بدون مرافقين حاضرين)
                </td>
              </tr>
            </template>

            <!-- If Bus is Empty -->
            <tr v-if="bus.seatedStudents.length === 0">
              <td colspan="5" class="border border-black p-8 text-center text-gray-500 font-bold">
                لا توجد عائلات مسكنة في هذا الأتوبيس حالياً
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer: Totals and Signatures -->
      <div class="print-footer mt-4 pt-3 border-t-2 border-black">
        <div class="flex justify-between items-center bg-gray-100 border border-black p-2 rounded-lg text-xs font-bold mb-4">
          <div>
            إجمالي العائلات بالأتوبيس:
            <span class="text-black font-black mx-1">{{ bus.familiesCount }}</span>
            / {{ bus.maxFamilies }} عائلة
          </div>
          <div>
            إجمالي الأفراد الحاضرين:
            <span class="text-black font-black mx-1">{{ bus.personsCount }}</span>
            / {{ bus.maxPersons }} فرد
          </div>
          <div>
            المقاعد المتبقية:
            <span class="text-black font-black mx-1">{{ Math.max(0, bus.maxPersons - bus.personsCount) }}</span>
            مقعد
          </div>
        </div>

        <!-- Signature Line: قائد المأمورية -->
        <div class="flex justify-center text-center text-xs pt-2">
          <div class="border-t border-black pt-2 w-80">
            <span class="font-bold block text-sm">قائد المأمورية</span>
            <span class="text-gray-700 text-xs block mb-4">({{ staffData.manager || '.......................' }})</span>
            <span class="text-gray-400 block text-[10px]">التوقيع: ............................</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { formatArabicDate, formatArabicTime } from '../utils/arabicUtils.js';

const props = defineProps({
  targetBusNumber: {
    type: [Number, String],
    default: null
  },
  staff: {
    type: Object,
    default: () => ({
      manager: ''
    })
  }
});

const store = useBusesStore();

const staffData = computed(() => {
  return {
    manager: props.staff?.manager || ''
  };
});

const printDate = computed(() => {
  const now = new Date();
  return `${formatArabicDate(now)} — ${formatArabicTime(now)}`;
});

const printBuses = computed(() => {
  let targetList = store.buses;
  if (props.targetBusNumber) {
    targetList = store.buses.filter(b => Number(b.number) === Number(props.targetBusNumber));
  }

  return targetList.map(bus => {
    const seated = store.students.filter(s => s.bus_number === bus.number);
    let totalPersons = 0;
    seated.forEach(s => {
      totalPersons += (s.persons_count || (1 + (s.families ? s.families.length : 0)));
    });

    return {
      number: bus.number,
      maxFamilies: bus.maxFamilies,
      maxPersons: bus.maxPersons,
      familiesCount: seated.length,
      personsCount: totalPersons,
      seatedStudents: seated
    };
  });
});
</script>

<style scoped>
/* Hidden on screen, visible only when printing */
.print-container {
  display: none;
}

@media print {
  body * {
    visibility: hidden;
  }

  .print-container,
  .print-container * {
    visibility: visible;
  }

  .print-container {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background: white;
  }

  .print-page {
    width: 100%;
    min-height: 100vh;
    padding: 1.5cm;
    page-break-after: always;
    break-after: page;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .no-print {
    display: none !important;
  }
}
</style>
