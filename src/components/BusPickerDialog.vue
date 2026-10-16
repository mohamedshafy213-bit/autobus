<template>
  <Dialog
    v-model:visible="visible"
    modal
    :showHeader="false"
    :closable="false"
    :style="{ width: '96vw', maxWidth: '1480px', maxHeight: '92vh', height: '92vh' }"
    class="bus-picker-dialog rounded-3xl overflow-hidden shadow-2xl"
    :pt="{
      root: { class: '!rounded-3xl !border-0 !shadow-2xl !overflow-hidden !max-h-[92vh] !h-[92vh] !flex !flex-col' },
      header: { class: '!hidden !p-0 !m-0 !border-0 !h-0 !min-h-0' },
      content: { class: '!p-0 !rounded-3xl !overflow-hidden !flex !flex-col !flex-1 !min-h-0 !h-full' }
    }"
    @hide="onClose"
  >
    <div v-if="student" class="flex flex-col h-full min-h-0 bg-white rounded-3xl overflow-hidden text-right" dir="rtl">
      
      <!-- ======================================================== -->
      <!-- 1. DIALOG HEADER (Fixed at top - flush with rounded edge)-->
      <!-- ======================================================== -->
      <div class="px-5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shrink-0 border-b border-slate-700/80">
        <div class="flex items-center justify-between gap-4">
          
          <!-- Student Info & Mode -->
          <div class="space-y-1 flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border',
                  isMoveMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                ]"
              >
                <i :class="isMoveMode ? 'pi pi-arrow-right-arrow-left' : 'pi pi-check-circle'"></i>
                <span>{{ isMoveMode ? 'نقل العائلة لأتوبيس آخر' : 'تسجيل الحضور واختيار الأتوبيس' }}</span>
              </span>

              <!-- Category Badge -->
              <span
                v-if="(student.families || []).length > 4"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-500/20 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold"
              >
                <i class="pi pi-star-fill text-[10px] text-purple-300"></i>
                <span>فئة دعوات خاصة (★ {{ (student.families || []).length }} دعوات — عداد الـ 2)</span>
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-700/60 text-slate-200 border border-slate-600 rounded-full text-xs font-semibold"
              >
                <span>فئة عادية ({{ (student.families || []).length }} دعوات — عداد الـ 7)</span>
              </span>
            </div>

            <!-- Student Name & Military Number -->
            <div class="flex items-center gap-3 flex-wrap">
              <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {{ student.name }}
              </h3>
              <span class="text-xs font-mono font-bold bg-white/10 text-emerald-300 px-2.5 py-0.5 rounded-lg border border-white/10 shrink-0">
                رقم: {{ student.military_number }}
              </span>
            </div>
          </div>

          <!-- Total Passengers Summary & Close Button -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="text-center bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-2xl shadow-inner">
              <span class="text-[11px] text-slate-400 block font-bold">الحاضرين للأتوبيس</span>
              <span class="text-xl font-black text-emerald-400 font-mono leading-none">{{ familyPersonsCount }} فرد</span>
              <span class="text-[10px] text-slate-400 block mt-0.5">طالب + {{ checkedMembersCount }} مرافقين</span>
            </div>

            <button
              type="button"
              @click="visible = false"
              class="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 shrink-0"
              title="إغلاق (Esc)"
            >
              <i class="pi pi-times text-base"></i>
            </button>
          </div>

        </div>
      </div>

      <!-- ======================================================== -->
      <!-- AUTO SEATING INFO BANNER (if enabled)                    -->
      <!-- ======================================================== -->
      <div
        v-if="store.settings.autoSeating && !isMoveMode"
        class="bg-amber-50 border-b border-amber-200 px-5 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 text-xs font-bold text-amber-950"
      >
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 text-xs">
            <i class="pi pi-bolt"></i>
          </div>
          <span>
            وضع التسكين التلقائي مفعل: المقترح الحالي هو 
            <span class="text-emerald-700 font-black text-sm underline ms-1">
              أتوبيس رقم {{ selectedBus || '—' }}
            </span>
            (يمكنك اختيار أي أتوبيس آخر يدوياً).
          </span>
        </div>

        <Button
          v-if="!allMembersArrived"
          label="حضور وتسكين فوري ⚡"
          icon="pi pi-bolt"
          size="small"
          class="!bg-amber-600 !border-amber-600 !text-white !text-xs !font-bold shadow-sm hover:!bg-amber-700 shrink-0 !py-1 !px-2.5"
          @click="markAllAndAutoConfirm"
        />
      </div>

      <!-- ======================================================== -->
      <!-- 2. MAIN DIALOG BODY                                      -->
      <!-- ======================================================== -->
      <div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-slate-100/60">
        
        <!-- ======================================================== -->
        <!-- MODE A: CHECK-IN MODE (Side-by-Side: Family + Buses)     -->
        <!-- Both columns stretch to 100% full height (items-stretch) -->
        <!-- ======================================================== -->
        <div v-if="!isMoveMode" class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 h-full items-stretch">
          
          <!-- ====================================================== -->
          <!-- RIGHT COLUMN: STEP 1 - FAMILY ATTENDANCE CHECKLIST     -->
          <!-- Full height column, members stacked vertically under   -->
          <!-- each other, names & national IDs clearly prominent!    -->
          <!-- Designed for max 6 members to fit without scrollbar.   -->
          <!-- ====================================================== -->
          <div class="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between h-full">
            
            <div class="flex-1 flex flex-col min-h-0">
              <!-- Step 1 Header -->
              <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                    1
                  </span>
                  <div>
                    <h4 class="text-sm font-black text-slate-900 leading-tight">
                      حضور أفراد الأسرة
                    </h4>
                    <span class="text-[11px] text-slate-500 font-semibold">
                      حضر ({{ checkedMembersCount }} من {{ totalMembersCount }})
                    </span>
                  </div>
                </div>

                <!-- Quick Action Toggle -->
                <Button
                  v-if="!allMembersArrived && memberList.length > 0"
                  label="الكل وصل ✓"
                  icon="pi pi-check"
                  size="small"
                  class="!bg-emerald-600 !border-emerald-600 !text-white !text-xs !font-bold shadow-xs hover:!bg-emerald-700 !py-1 !px-2.5"
                  @click="markAllMembers(true)"
                />
                <Button
                  v-else-if="memberList.length > 0"
                  label="إلغاء تحديد الكل"
                  icon="pi pi-refresh"
                  size="small"
                  severity="secondary"
                  outlined
                  class="!text-xs !font-bold !py-1 !px-2.5"
                  @click="markAllMembers(false)"
                />
              </div>

              <!-- Helpful note -->
              <p class="text-[11px] text-slate-500 font-medium mb-2.5 shrink-0">
                حدد الحاضرين فقط ليتم حجز مقاعدهم. غير الحاضرين لن يتم حجز مقاعد لهم بالأتوبيس.
              </p>

              <!-- Family Members Checklist: Stacked vertically under each other -->
              <!-- Max 6 members fit cleanly without vertical scrollbar -->
              <div class="space-y-2 flex-1 overflow-y-auto pe-1">
                <div
                  v-for="m in memberList"
                  :key="m.id"
                  @click="toggleMember(m.id)"
                  :class="[
                    'py-2 px-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition select-none',
                    m.checked
                      ? 'bg-emerald-50/90 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  ]"
                >
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <!-- Checkbox -->
                    <input
                      type="checkbox"
                      :checked="m.checked"
                      class="w-5 h-5 rounded cursor-pointer accent-emerald-600 text-emerald-600 focus:ring-emerald-500 pointer-events-none shrink-0"
                    />

                    <!-- Member Info: Name, Relation, National ID -->
                    <div class="min-w-0 flex-1">
                      <!-- Name & Relation -->
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-black text-sm sm:text-base text-slate-900 leading-snug">
                          {{ m.name }}
                        </span>
                        <span class="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          {{ m.relation || 'مرافق' }}
                        </span>
                      </div>

                      <!-- National ID - Very obvious and prominent -->
                      <div v-if="m.national_id" class="flex items-center gap-1.5 mt-1 text-xs">
                        <span class="text-slate-500 font-bold text-[11px]">الرقم القومي:</span>
                        <span class="font-mono font-black text-xs sm:text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 tracking-wider">
                          {{ m.national_id }}
                        </span>
                      </div>
                      <div v-else class="text-[11px] text-slate-400 font-semibold mt-0.5">
                        بدون رقم قومي
                      </div>
                    </div>
                  </div>

                  <!-- Attendance Status Tag -->
                  <Tag
                    :value="m.checked ? '✓ حضر' : 'غائب'"
                    :severity="m.checked ? 'success' : 'secondary'"
                    class="!text-xs !font-black !px-2.5 !py-1 shrink-0"
                  />
                </div>

                <!-- In case student has 0 family members -->
                <div v-if="memberList.length === 0" class="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <i class="pi pi-user text-2xl text-slate-400"></i>
                  <div class="text-xs font-bold text-slate-700">الطالب مسجل بدون مرافقين</div>
                  <div class="text-[11px] text-slate-500">(حضور فردي — سيتم حجز مقعد واحد فقط للطالب)</div>
                </div>
              </div>
            </div>

            <!-- Attendance Status Footer in Column 1 (Always pinned to bottom of right card) -->
            <div class="mt-3 pt-2.5 border-t border-slate-100 shrink-0">
              <div
                v-if="allMembersArrived && memberList.length > 0"
                class="bg-emerald-50 border border-emerald-300/80 p-2.5 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2"
              >
                <i class="pi pi-check-circle text-emerald-600 text-base shrink-0"></i>
                <span>اكتمل حضور جميع المرافقين ✓ الأتوبيسات جاهزة للتسكين.</span>
              </div>
              <div
                v-else-if="memberList.length > 0"
                class="bg-amber-50 border border-amber-300/80 p-2.5 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2"
              >
                <i class="pi pi-info-circle text-amber-600 text-base shrink-0"></i>
                <span>حضور جزئي: سيتم تسكين {{ familyPersonsCount }} فرد فقط (طالب + {{ checkedMembersCount }} مرافقين).</span>
              </div>
            </div>

          </div>

          <!-- ====================================================== -->
          <!-- LEFT COLUMN: STEP 2 - BUS SELECTION WITH PAGINATOR     -->
          <!-- Displays (buses / 3 = 9 buses) on the first page       -->
          <!-- and Paginator right below                              -->
          <!-- ====================================================== -->
          <div class="lg:col-span-7 bg-white border-2 border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full">
            
            <div class="flex-1 flex flex-col min-h-0">
              <!-- Step 2 Header & Quick Selection Badge -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2 mb-2 shrink-0">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shadow-xs">
                    2
                  </span>
                  <div>
                    <h4 class="text-base font-black text-slate-900 leading-tight flex items-center gap-2">
                      <span>اختيار الأتوبيس المطلوب</span>
                      <span class="text-xs font-bold text-slate-500 font-normal">
                        ({{ availableBusesCount }} متاح من {{ enrichedBuses.length }})
                      </span>
                    </h4>
                    <span class="text-[11px] text-slate-500 font-semibold">
                      اضغط على أي أتوبيس متاح لتحديده
                    </span>
                  </div>
                </div>

                <!-- Selected Bus Pill -->
                <div>
                  <span
                    v-if="selectedBus"
                    class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-full shadow-sm"
                  >
                    <i class="pi pi-check"></i>
                    <span>الأتوبيس المحدد: رقم {{ selectedBus }}</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-full animate-pulse"
                  >
                    <i class="pi pi-hand-point-down"></i>
                    <span>يرجى اختيار الأتوبيس</span>
                  </span>
                </div>
              </div>

              <!-- Filter Tabs & Quick Search -->
              <div class="flex items-center justify-between gap-2 mb-2 shrink-0">
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    @click="busFilterTab = 'all'"
                    :class="[
                      'px-2.5 py-1 rounded-lg transition',
                      busFilterTab === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    ]"
                  >
                    الكل ({{ enrichedBuses.length }})
                  </button>
                  <button
                    type="button"
                    @click="busFilterTab = 'available'"
                    :class="[
                      'px-2.5 py-1 rounded-lg transition',
                      busFilterTab === 'available'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    ]"
                  >
                    المتاحة فقط ({{ availableBusesCount }})
                  </button>
                </div>

                <!-- Bus number filter input -->
                <div class="relative w-36">
                  <input
                    v-model="busSearchQuery"
                    type="text"
                    placeholder="رقم الأتوبيس..."
                    class="w-full text-xs font-bold py-1 pe-7 ps-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <i class="pi pi-search absolute right-2.5 top-1.5 text-slate-400 text-[10px] pointer-events-none"></i>
                </div>
              </div>

              <!-- Buses Grid: 3 columns x 3 rows = 9 buses per page (buses / 3) -->
              <div class="flex-1 overflow-y-auto pe-1">
                <div v-if="paginatedBuses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  <div
                    v-for="bus in paginatedBuses"
                    :key="bus.number"
                    @click="!bus.isDisabled && selectBus(bus.number)"
                    :class="[
                      'p-2 rounded-xl border-2 transition-all duration-150 relative select-none flex flex-col justify-between',
                      bus.isDisabled
                        ? 'opacity-55 bg-slate-100/90 border-slate-200 cursor-not-allowed'
                        : selectedBus === bus.number
                          ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-4 ring-emerald-500/25 cursor-pointer scale-[1.01]'
                          : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50/80 cursor-pointer shadow-xs'
                    ]"
                  >
                    <div>
                      <!-- Card Top: Bus Number & Status Tag -->
                      <div class="flex items-start justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <div
                            :class="[
                              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm transition-colors shrink-0 shadow-xs',
                              selectedBus === bus.number && !bus.isDisabled
                                ? 'bg-emerald-600 text-white shadow-emerald-700/30'
                                : bus.isDisabled
                                  ? 'bg-slate-300 text-slate-600'
                                  : 'bg-slate-800 text-white'
                            ]"
                          >
                            {{ bus.number }}
                          </div>
                          <div class="truncate">
                            <span class="font-black text-xs text-slate-900 block truncate">
                              أتوبيس رقم {{ bus.number }}
                            </span>
                            <span class="text-[10px] font-bold block truncate" :class="bus.remainingPersons > 0 ? 'text-emerald-700' : 'text-slate-400'">
                              متبقي {{ bus.remainingPersons }} مقعد
                            </span>
                          </div>
                        </div>

                        <!-- Status Tag -->
                        <div class="shrink-0">
                          <Tag
                            v-if="bus.isCurrentBus"
                            value="الأتوبيس الحالي"
                            severity="secondary"
                            class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                          />
                          <Tag
                            v-else-if="bus.isDisabled"
                            :value="bus.disableReason"
                            severity="danger"
                            class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                          />
                          <Tag
                            v-else-if="bus.isFull"
                            value="مكتمل"
                            severity="warn"
                            class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                          />
                          <Tag
                            v-else
                            value="متاح للتسكين ✓"
                            severity="success"
                            class="!text-[9px] !font-bold !px-1.5 !py-0.5 !bg-emerald-100 !text-emerald-800 !border !border-emerald-200"
                          />
                        </div>
                      </div>

                      <!-- Category Counters: <= 4 and > 4 -->
                      <div class="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-bold mb-1">
                        <div class="flex items-center justify-between">
                          <span class="text-slate-600">≤ 4:</span>
                          <span class="font-mono text-[10px] font-black" :class="bus.regularFamiliesCount >= bus.maxRegularFamilies ? 'text-amber-600' : 'text-emerald-700'">
                            {{ bus.regularFamiliesCount }}/{{ bus.maxRegularFamilies }}
                          </span>
                        </div>
                        <div class="flex items-center justify-between border-s border-slate-200 ps-1">
                          <span class="text-purple-900">★ > 4:</span>
                          <span class="font-mono text-[10px] font-black" :class="bus.specialFamiliesCount >= bus.maxSpecialFamilies ? 'text-purple-900' : 'text-purple-700'">
                            {{ bus.specialFamiliesCount }}/{{ bus.maxSpecialFamilies }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Card Bottom: Dual Progress Bars -->
                    <div class="space-y-0.5 text-[9px] pt-1 border-t border-slate-100">
                      <div>
                        <div class="flex justify-between items-center text-slate-600 mb-0.5">
                          <span class="font-bold">العائلات:</span>
                          <span class="font-mono font-bold">
                            {{ bus.familiesCount }} / {{ bus.maxFamilies }}
                          </span>
                        </div>
                        <ProgressBar
                          :value="Math.min(100, Math.round((bus.familiesCount / bus.maxFamilies) * 100))"
                          :showValue="false"
                          class="!h-1"
                        />
                      </div>

                      <div>
                        <div class="flex justify-between items-center text-slate-600 mb-0.5">
                          <span class="font-bold">الأفراد:</span>
                          <span class="font-mono font-bold">
                            {{ bus.personsCount }} / {{ bus.maxPersons }}
                          </span>
                        </div>
                        <ProgressBar
                          :value="Math.min(100, Math.round((bus.personsCount / bus.maxPersons) * 100))"
                          :showValue="false"
                          class="!h-1"
                        />
                      </div>
                    </div>

                    <!-- Selection Check Badge on top left corner -->
                    <div
                      v-if="selectedBus === bus.number && !bus.isDisabled"
                      class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-md border-2 border-white"
                    >
                      <i class="pi pi-check"></i>
                    </div>
                  </div>
                </div>

                <!-- No buses match search -->
                <div v-else class="text-center py-8 text-xs text-slate-400 font-bold bg-white rounded-xl border border-slate-200">
                  لا توجد أتوبيسات تطابق البحث أو الفلتر المحدد
                </div>
              </div>

            </div>

            <!-- Paginator below the buses (Pinned at bottom of Left Card) -->
            <div v-if="totalPages > 1" class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <!-- Showing Info -->
              <div class="text-[11px] text-slate-500 font-bold hidden sm:block">
                عرض {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredBuses.length) }} من {{ filteredBuses.length }} أتوبيس
              </div>

              <!-- Pagination Controls -->
              <div class="flex items-center gap-1.5 mx-auto sm:mx-0">
                <!-- Prev Button -->
                <button
                  type="button"
                  @click="goToPage(currentPage - 1)"
                  :disabled="currentPage === 1"
                  :class="[
                    'px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition',
                    currentPage === 1
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                  ]"
                >
                  <i class="pi pi-angle-right"></i>
                  <span>السابق</span>
                </button>

                <!-- Page Numbers -->
                <div class="flex items-center gap-1">
                  <button
                    v-for="p in totalPages"
                    :key="p"
                    type="button"
                    @click="goToPage(p)"
                    :class="[
                      'w-7 h-7 rounded-lg text-xs font-black transition flex items-center justify-center',
                      currentPage === p
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                    ]"
                  >
                    {{ p }}
                  </button>
                </div>

                <!-- Next Button -->
                <button
                  type="button"
                  @click="goToPage(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  :class="[
                    'px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition',
                    currentPage === totalPages
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                  ]"
                >
                  <span>التالي</span>
                  <i class="pi pi-angle-left"></i>
                </button>
              </div>
            </div>

          </div>

        </div>

        <!-- ======================================================== -->
        <!-- MODE B: MOVE MODE (Full-Width Bus Selection Grid)        -->
        <!-- ======================================================== -->
        <div v-else class="space-y-3 flex flex-col justify-between h-full">
          
          <div class="flex-1 flex flex-col min-h-0">
            <div class="bg-white border border-slate-200 rounded-2xl p-3.5 mb-2.5 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                  <i class="pi pi-arrow-right-arrow-left"></i>
                </span>
                <div>
                  <h4 class="text-sm font-black text-slate-900">
                    حدد الأتوبيس الجديد لنقل عائلة الطالب
                  </h4>
                  <p class="text-xs text-slate-500">
                    الأتوبيس الحالي للطالب هو 
                    <strong class="text-slate-900">أتوبيس رقم {{ student.bus_number || 'غير مسكن' }}</strong>.
                    اختر الأتوبيس البديل لنقل {{ familyPersonsCount }} فرد.
                  </p>
                </div>
              </div>

              <!-- Current selected destination -->
              <div v-if="selectedBus">
                <span class="px-4 py-1.5 bg-emerald-600 text-white font-black text-xs rounded-full shadow-sm">
                  الوجهة المختارة: أتوبيس رقم {{ selectedBus }}
                </span>
              </div>
            </div>

            <!-- Filter Tabs & Quick Search in Move Mode -->
            <div class="flex items-center justify-between gap-2 mb-2.5 shrink-0">
              <div class="flex items-center gap-1 bg-white p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  @click="busFilterTab = 'all'"
                  :class="[
                    'px-2.5 py-1 rounded-lg transition',
                    busFilterTab === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  الكل ({{ enrichedBuses.length }})
                </button>
                <button
                  type="button"
                  @click="busFilterTab = 'available'"
                  :class="[
                    'px-2.5 py-1 rounded-lg transition',
                    busFilterTab === 'available'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  المتاحة فقط ({{ availableBusesCount }})
                </button>
              </div>

              <!-- Bus number filter input -->
              <div class="relative w-40">
                <input
                  v-model="busSearchQuery"
                  type="text"
                  placeholder="رقم الأتوبيس..."
                  class="w-full text-xs font-bold py-1 pe-7 ps-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                />
                <i class="pi pi-search absolute right-2.5 top-1.5 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>

            <!-- Full width grid of buses (3 cols) -->
            <div class="flex-1 overflow-y-auto pe-1">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div
                  v-for="bus in paginatedBuses"
                  :key="bus.number"
                  @click="!bus.isDisabled && selectBus(bus.number)"
                  :class="[
                    'p-2 rounded-xl border-2 transition-all relative select-none flex flex-col justify-between',
                    bus.isDisabled
                      ? 'opacity-55 bg-slate-100/90 border-slate-200 cursor-not-allowed'
                      : selectedBus === bus.number
                        ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-4 ring-emerald-500/25 cursor-pointer scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-slate-50 cursor-pointer shadow-xs'
                  ]"
                >
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex items-center gap-2">
                        <div
                          :class="[
                            'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm',
                            selectedBus === bus.number && !bus.isDisabled
                              ? 'bg-emerald-600 text-white'
                              : bus.isDisabled
                                ? 'bg-slate-300 text-slate-600'
                                : 'bg-slate-800 text-white'
                          ]"
                        >
                          {{ bus.number }}
                        </div>
                        <div>
                          <span class="font-bold text-xs text-slate-900 block">أتوبيس رقم {{ bus.number }}</span>
                          <span class="text-[10px] text-slate-500 block">متبقي {{ bus.remainingPersons }} مقعد</span>
                        </div>
                      </div>

                      <Tag
                        v-if="bus.isCurrentBus"
                        value="الحالي"
                        severity="secondary"
                        class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                      />
                      <Tag
                        v-else-if="bus.isDisabled"
                        :value="bus.disableReason"
                        severity="danger"
                        class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                      />
                      <Tag
                        v-else
                        value="متاح"
                        severity="success"
                        class="!text-[9px] !font-bold !px-1.5 !py-0.5"
                      />
                    </div>

                    <!-- Category Counters -->
                    <div class="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-bold mb-1">
                      <div class="flex justify-between">
                        <span class="text-slate-600">≤ 4:</span>
                        <span class="font-mono text-emerald-700 font-bold">{{ bus.regularFamiliesCount }}/{{ bus.maxRegularFamilies }}</span>
                      </div>
                      <div class="flex justify-between border-s border-slate-200 ps-1">
                        <span class="text-purple-900">★ > 4:</span>
                        <span class="font-mono text-purple-700 font-bold">{{ bus.specialFamiliesCount }}/{{ bus.maxSpecialFamilies }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Progress bars -->
                  <div class="space-y-0.5 text-[9px] text-slate-600">
                    <div class="flex justify-between">
                      <span>العائلات: {{ bus.familiesCount }}/{{ bus.maxFamilies }}</span>
                      <span>الأفراد: {{ bus.personsCount }}/{{ bus.maxPersons }}</span>
                    </div>
                    <ProgressBar
                      :value="Math.min(100, Math.round((bus.personsCount / bus.maxPersons) * 100))"
                      :showValue="false"
                      class="!h-1"
                    />
                  </div>

                  <div
                    v-if="selectedBus === bus.number && !bus.isDisabled"
                    class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-sm"
                  >
                    <i class="pi pi-check"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Paginator for Move Mode -->
          <div v-if="totalPages > 1" class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <div class="text-[11px] text-slate-500 font-bold hidden sm:block">
              عرض {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredBuses.length) }} من {{ filteredBuses.length }}
            </div>
            <div class="flex items-center gap-1.5 mx-auto sm:mx-0">
              <button
                type="button"
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                :class="[
                  'px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition',
                  currentPage === 1 ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                ]"
              >
                <i class="pi pi-angle-right"></i>
                <span>السابق</span>
              </button>

              <div class="flex items-center gap-1">
                <button
                  v-for="p in totalPages"
                  :key="p"
                  type="button"
                  @click="goToPage(p)"
                  :class="[
                    'w-7 h-7 rounded-lg text-xs font-black transition flex items-center justify-center',
                    currentPage === p ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                  ]"
                >
                  {{ p }}
                </button>
              </div>

              <button
                type="button"
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                :class="[
                  'px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition',
                  currentPage === totalPages ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer'
                ]"
              >
                <span>التالي</span>
                <i class="pi pi-angle-left"></i>
              </button>
            </div>
          </div>

        </div>

      </div>

      <!-- ======================================================== -->
      <!-- 3. DIALOG FOOTER (Fixed at the bottom, ALWAYS visible!)  -->
      <!-- ======================================================== -->
      <div class="px-5 py-3 bg-white border-t border-slate-200 shrink-0 mt-auto flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg z-10">
        
        <!-- Selection Recap on Right -->
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
          <template v-if="selectedBus">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>
              الأتوبيس المختار: <strong class="text-emerald-700 text-sm font-black">أتوبيس رقم {{ selectedBus }}</strong>
              <span class="text-slate-400 mx-1.5">|</span>
              الحاضرين: <strong class="text-slate-900 text-sm font-black">{{ familyPersonsCount }} فرد</strong>
            </span>
          </template>
          <template v-else>
            <span class="text-amber-700 flex items-center gap-1.5">
              <i class="pi pi-exclamation-triangle"></i>
              <span>يرجى اختيار الأتوبيس المطلوب لتفعيل زر التأكيد</span>
            </span>
          </template>
        </div>

        <!-- Buttons on Left -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            label="إلغاء (Esc)"
            icon="pi pi-times"
            severity="secondary"
            outlined
            class="!font-bold !text-xs sm:!text-sm !py-2.5 !px-5"
            :disabled="submitting"
            @click="visible = false"
          />

          <!-- Confirm Seating Button -->
          <Button
            :label="submitting ? 'جاري التأكيد...' : (isMoveMode ? `تأكيد النقل إلى أتوبيس (${selectedBus || '...'})` : (selectedBus ? `تأكيد التسكين في أتوبيس (${selectedBus}) — ${familyPersonsCount} فرد` : 'اختر الأتوبيس أولاً للتأكيد'))"
            icon="pi pi-check"
            :class="[
              '!font-black !text-sm sm:!text-base !py-2.5 !px-6 shadow-lg transition-all',
              canConfirm
                ? '!bg-emerald-600 !border-emerald-600 !text-white shadow-emerald-700/25 hover:!bg-emerald-700 cursor-pointer scale-[1.01]'
                : '!bg-slate-200 !border-slate-200 !text-slate-400 opacity-60 cursor-not-allowed shadow-none'
            ]"
            :disabled="!canConfirm"
            :loading="submitting"
            @click="confirmSeating"
          />
        </div>

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

// Filter tabs for buses in Column 2
const busFilterTab = ref('all'); // 'all' | 'available'
const busSearchQuery = ref('');

// Pagination state
const currentPage = ref(1);

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
        ? `اكتمل حد عائلات > 4 (${maxSpecial}/${maxSpecial})`
        : `اكتمل حد عائلات ≤ 4 (${maxRegular}/${maxRegular})`;
    } else if (exceedFamilies) {
      isDisabled = true;
      disableReason = 'اكتمل عدد العائلات';
    } else if (exceedPersons) {
      isDisabled = true;
      disableReason = 'لا يتسع لعدد الأفراد';
    }

    const remainingPersons = Math.max(0, bus.maxPersons - bus.personsCount);
    const remainingFamilies = Math.max(0, bus.maxFamilies - bus.familiesCount);

    return {
      ...bus,
      maxRegularFamilies: maxRegular,
      maxSpecialFamilies: maxSpecial,
      regularFamiliesCount: bus.regularFamiliesCount || 0,
      specialFamiliesCount: bus.specialFamiliesCount || 0,
      remainingPersons,
      remainingFamilies,
      isCurrentBus: isCurrent,
      isDisabled,
      disableReason,
      isFull: bus.familiesCount >= bus.maxFamilies || bus.personsCount >= bus.maxPersons || (effectiveRegular >= maxRegular && effectiveSpecial >= maxSpecial)
    };
  });
});

// Count of available buses
const availableBusesCount = computed(() => {
  return enrichedBuses.value.filter(b => !b.isDisabled).length;
});

// Filtered buses based on filter tab and search query
const filteredBuses = computed(() => {
  return enrichedBuses.value.filter(bus => {
    if (busFilterTab.value === 'available' && bus.isDisabled) {
      return false;
    }
    if (busSearchQuery.value.trim()) {
      const q = busSearchQuery.value.trim();
      return bus.number.toString().includes(q);
    }
    return true;
  });
});

// Items per page: (number of buses) / 3 so all buses are distributed over 3 pages
const pageSize = computed(() => {
  const total = store.buses?.length || 26;
  return Math.max(1, Math.ceil(total / 3));
});

// Total pages based on filtered list
const totalPages = computed(() => {
  const count = filteredBuses.value.length;
  if (count === 0) return 1;
  return Math.ceil(count / pageSize.value);
});

// Sliced buses for the active page
const paginatedBuses = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredBuses.value.slice(start, start + pageSize.value);
});

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

// Automatically navigate to the page that contains the given bus number
function ensureBusPageVisible(busNum) {
  if (!busNum) return;
  const idx = filteredBuses.value.findIndex(b => b.number === busNum);
  if (idx !== -1) {
    const targetPage = Math.floor(idx / pageSize.value) + 1;
    currentPage.value = targetPage;
  }
}

// Reset page to 1 on filter or search changes unless selected bus is present
watch([busFilterTab, busSearchQuery], () => {
  currentPage.value = 1;
  if (selectedBus.value) {
    ensureBusPageVisible(selectedBus.value);
  }
});

const isSelectedBusDisabled = computed(() => {
  if (!selectedBus.value) return true;
  const target = enrichedBuses.value.find(b => b.number === selectedBus.value);
  return target ? target.isDisabled : true;
});

// Can confirm when an available bus is selected
const canConfirm = computed(() => {
  if (submitting.value || store.isWriteDisabled) return false;
  if (!selectedBus.value || isSelectedBusDisabled.value) return false;
  return true;
});

// Initialize selection & family checklist when dialog opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    store.refreshState(true);
    busSearchQuery.value = '';
    busFilterTab.value = 'all';
    currentPage.value = 1;

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
      if (selectedBus.value) {
        ensureBusPageVisible(selectedBus.value);
      }
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
      ensureBusPageVisible(selectedBus.value);
    }
  }
});

function markAllAndAutoConfirm() {
  markAllMembers(true);
  if (!selectedBus.value) {
    const firstAvailable = enrichedBuses.value.find(b => !b.isDisabled);
    if (firstAvailable) {
      selectedBus.value = firstAvailable.number;
      ensureBusPageVisible(selectedBus.value);
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
      ensureBusPageVisible(selectedBus.value);
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
