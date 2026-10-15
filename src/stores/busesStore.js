import { defineStore } from 'pinia';
import { matchesArabicQuery, normalizeArabic } from '../utils/arabicUtils.js';
import * as api from '../utils/api.js';

export const useBusesStore = defineStore('buses', {
  state: () => ({
    students: [],
    buses: [],
    settings: {
      busCount: 10,
      defaultMaxFamilies: 8,
      defaultMaxPersons: 40,
      autoSeating: false,
      overrides: {}
    },
    isOnline: true,
    isInitialized: false,
    pollTimer: null,
    searchQuery: '',
    statusFilter: 'all', // 'all' | 'arrived' | 'not_arrived'
    busFilter: null,
    lastChosenBus: Number(localStorage.getItem('autobus_last_bus')) || 1,
    actionLoading: false,
    lastPollError: null,
    deviceInfo: {
      serverIp: '130.117.53.42',
      clientIp: '',
      isServerDevice: true
    },
    failover: {
      activeServer: 'primary', // 'primary' | 'backup'
      primaryUrl: '',
      backupUrl: '',
      primaryOnline: true,
      backupOnline: false,
      lastFailoverEvent: null,
      lastSyncTime: null,
      lastSyncStatus: 'idle', // 'idle' | 'success' | 'error'
      lastSyncError: null
    }
  }),

  getters: {
    // Total counters
    stats(state) {
      const totalStudents = state.students.length;
      let arrivedStudents = 0;
      let totalPersons = 0;
      let arrivedPersons = 0;
      let partialAttendanceStudents = 0;

      for (const s of state.students) {
        const persons = s.persons_count || (1 + (s.families ? s.families.length : 0));
        totalPersons += (s.total_registered_persons || persons);
        if (s.bus_number) {
          arrivedStudents += 1;
          arrivedPersons += persons;

          const hasFamilies = s.families && s.families.length > 0;
          if (hasFamilies && s.families.some(m => !m.attended)) {
            partialAttendanceStudents += 1;
          }
        }
      }

      return {
        totalStudents,
        arrivedStudents,
        remainingStudents: totalStudents - arrivedStudents,
        totalPersons,
        arrivedPersons,
        remainingPersons: totalPersons - arrivedPersons,
        partialAttendanceStudents
      };
    },

    // Filtered students list based on search and filters
    filteredStudents(state) {
      const query = (state.searchQuery || '').trim();
      const status = state.statusFilter;
      const bus = state.busFilter;

      return state.students.filter(student => {
        // Status filter
        if (status === 'arrived' && !student.bus_number) return false;
        if (status === 'not_arrived' && student.bus_number) return false;
        if (status === 'partial_attendance') {
          const hasMembers = student.families && student.families.length > 0;
          const hasAbsent = hasMembers && student.families.some(m => !m.attended);
          if (!student.bus_number || !hasAbsent) return false;
        }

        // Bus filter
        if (bus !== null && bus !== '' && student.bus_number !== Number(bus)) return false;

        // Search query filter (matches student name, military number, family member name, or national ID)
        if (query) {
          const matchMilitary = String(student.military_number).includes(query) ||
            normalizeArabic(student.military_number).includes(normalizeArabic(query));
          const matchStudentName = matchesArabicQuery(student.name, query);

          const matchFamily = (student.families || []).some(m =>
            matchesArabicQuery(m.name, query) ||
            (m.national_id && String(m.national_id).includes(query))
          );

          if (!matchMilitary && !matchStudentName && !matchFamily) {
            return false;
          }
        }

        return true;
      });
    },

    // Get bus details by bus number
    getBusByNumber: (state) => (busNumber) => {
      const num = Number(busNumber);
      return state.buses.find(b => b.number === num) || null;
    },

    // Families seated in a specific bus
    getBusFamilies: (state) => (busNumber) => {
      const num = Number(busNumber);
      return state.students.filter(s => s.bus_number === num);
    },

    isWriteDisabled(state) {
      return !state.isOnline || state.actionLoading;
    }
  },

  actions: {
    // Initial load and start 3-second polling
    async init() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      // Initialize failover configuration
      const sCfg = api.getServerConfig();
      this.failover.primaryUrl = sCfg.primaryServerUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      this.failover.backupUrl = sCfg.backupServerUrl || '';
      this.failover.activeServer = sCfg.activeServer;

      api.onFailover((event) => {
        this.failover.activeServer = event.switchedTo;
        this.failover.lastFailoverEvent = event;
        console.warn('Failover event detected in store:', event);
      });

      await this.refreshState();

      // If settings had a backupServerUrl, sync it
      if (this.settings.backupServerUrl && !this.failover.backupUrl) {
        this.failover.backupUrl = this.settings.backupServerUrl;
        api.setServerConfig({ backupUrl: this.settings.backupServerUrl });
      }

      try {
        const info = await api.apiGetDeviceInfo();
        if (info) this.deviceInfo = info;
      } catch (e) {
        // ignore
      }

      // Check initial replication status
      this.checkReplicationHealth();

      // Poll every 3 seconds
      if (this.pollTimer) clearInterval(this.pollTimer);
      let pollCounter = 0;
      this.pollTimer = setInterval(() => {
        this.refreshState(true);
        pollCounter++;
        // Check backup server health every ~6 seconds
        if (pollCounter % 2 === 0) {
          this.checkReplicationHealth();
        }
      }, 3000);
    },

    // Fetch latest state from server
    async refreshState(isBackground = false) {
      try {
        const data = await api.fetchState();
        this.students = data.students || [];
        this.buses = data.buses || [];
        this.settings = data.settings || this.settings;
        this.isOnline = true;
        this.lastPollError = null;
        if (this.failover.activeServer === 'primary') {
          this.failover.primaryOnline = true;
        } else {
          this.failover.backupOnline = true;
        }
      } catch (err) {
        this.isOnline = false;
        this.lastPollError = err.message || 'انقطع الاتصال بالسيرفر';
        if (this.failover.activeServer === 'primary') {
          this.failover.primaryOnline = false;
        } else {
          this.failover.backupOnline = false;
        }
        if (!isBackground) {
          throw err;
        }
      }
    },

    // Check replication health and ping the other server
    async checkReplicationHealth() {
      try {
        const repStatus = await api.apiGetReplicationStatus();
        if (repStatus) {
          this.failover.lastSyncTime = repStatus.lastSyncTime;
          this.failover.lastSyncStatus = repStatus.lastSyncStatus;
          this.failover.lastSyncError = repStatus.lastSyncError;
          if (repStatus.backupServerUrl && !this.failover.backupUrl) {
            this.failover.backupUrl = repStatus.backupServerUrl;
            api.setServerConfig({ backupUrl: repStatus.backupServerUrl });
          }
        }
      } catch (e) {
        // ignore
      }

      // Ping backup server if configured and we are currently on primary
      if (this.failover.backupUrl) {
        api.apiPingServer(this.failover.backupUrl).then(res => {
          this.failover.backupOnline = res.ok;
        }).catch(() => {
          this.failover.backupOnline = false;
        });
      }

      // Ping primary server if we failed over to backup
      if (this.failover.activeServer === 'backup' && this.failover.primaryUrl) {
        api.apiPingServer(this.failover.primaryUrl).then(res => {
          this.failover.primaryOnline = res.ok;
        }).catch(() => {
          this.failover.primaryOnline = false;
        });
      }
    },

    // Check-in and seat student family
    async seatFamily(studentNumber, busNumber, attendedMemberIds) {
      this.actionLoading = true;
      try {
        const result = await api.apiSeat(studentNumber, busNumber, attendedMemberIds);
        this.lastChosenBus = Number(busNumber);
        localStorage.setItem('autobus_last_bus', String(busNumber));
        await this.refreshState();
        return result;
      } catch (err) {
        // Refetch state on conflict to have fresh bus counts
        await this.refreshState().catch(() => {});
        throw err;
      } finally {
        this.actionLoading = false;
      }
    },

    // Auto-seat family into first available bus
    async autoSeatFamily(studentNumber, attendedMemberIds) {
      this.actionLoading = true;
      try {
        const result = await api.apiAutoSeat(studentNumber, attendedMemberIds);
        if (result && result.busNumber) {
          this.lastChosenBus = Number(result.busNumber);
          localStorage.setItem('autobus_last_bus', String(result.busNumber));
        }
        await this.refreshState();
        return result;
      } catch (err) {
        await this.refreshState().catch(() => {});
        throw err;
      } finally {
        this.actionLoading = false;
      }
    },

    // Cancel arrival / unseat
    async unseatFamily(studentNumber) {
      this.actionLoading = true;
      try {
        const result = await api.apiUnseat(studentNumber);
        await this.refreshState();
        return result;
      } catch (err) {
        await this.refreshState().catch(() => {});
        throw err;
      } finally {
        this.actionLoading = false;
      }
    },

    // Move family to another bus
    async moveFamily(studentNumber, busNumber, attendedMemberIds) {
      this.actionLoading = true;
      try {
        const result = await api.apiMove(studentNumber, busNumber, attendedMemberIds);
        this.lastChosenBus = Number(busNumber);
        localStorage.setItem('autobus_last_bus', String(busNumber));
        await this.refreshState();
        return result;
      } catch (err) {
        await this.refreshState().catch(() => {});
        throw err;
      } finally {
        this.actionLoading = false;
      }
    },

    // Add or update student
    async saveStudent(studentData, isEditing = false) {
      this.actionLoading = true;
      try {
        let result;
        if (isEditing) {
          result = await api.apiUpdateStudent(studentData.military_number, studentData);
        } else {
          result = await api.apiAddStudent(studentData);
        }
        await this.refreshState();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Delete student
    async deleteStudent(militaryNumber, force = false) {
      this.actionLoading = true;
      try {
        const result = await api.apiDeleteStudent(militaryNumber, force);
        await this.refreshState();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Delete all students
    async deleteAllStudents() {
      this.actionLoading = true;
      try {
        const result = await api.apiDeleteAllStudents();
        await this.refreshState();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Update settings
    async updateSettings(newSettings) {
      this.actionLoading = true;
      try {
        const result = await api.apiUpdateSettings(newSettings);
        await this.refreshState();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Reset seating
    async resetSeating() {
      this.actionLoading = true;
      try {
        const result = await api.apiResetSeating();
        await this.refreshState();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Import students
    async importStudents(studentsList, mode = 'skip') {
      this.actionLoading = true;
      try {
        const report = await api.apiImportStudents(studentsList, mode);
        await this.refreshState();
        return report;
      } finally {
        this.actionLoading = false;
      }
    },

    // Switch between Primary and Backup Server
    async switchActiveServer(target) {
      if (target !== 'primary' && target !== 'backup') return;
      api.setServerConfig({ active: target });
      this.failover.activeServer = target;
      await this.refreshState();
    },

    // Set and persist backup server URL
    async setBackupServerUrl(url) {
      const clean = (url || '').trim().replace(/\/$/, '');
      this.failover.backupUrl = clean;
      api.setServerConfig({ backupUrl: clean });
      await this.updateSettings({ ...this.settings, backupServerUrl: clean });
      await this.checkReplicationHealth();
    },

    // Push live database snapshot to backup server now
    async syncNowToBackup() {
      this.actionLoading = true;
      try {
        const result = await api.apiTriggerSyncNow(this.failover.backupUrl);
        await this.checkReplicationHealth();
        return result;
      } finally {
        this.actionLoading = false;
      }
    },

    // Pull database snapshot from primary server now
    async pullNowFromPrimary() {
      this.actionLoading = true;
      try {
        const result = await api.apiTriggerPullNow(this.failover.primaryUrl);
        await this.refreshState();
        await this.checkReplicationHealth();
        return result;
      } finally {
        this.actionLoading = false;
      }
    }
  }
});
