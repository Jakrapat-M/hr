'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, User, Clock, AlertTriangle, FileSpreadsheet, Lock, Sparkles, ChevronDown, ChevronUp, AlertCircle, Eye } from 'lucide-react';
import { Card, Button } from '@/components/humi';
import { useAuthStore } from '@/stores/auth-store';

// ── Mock Database (adapted from shift_assignment.html) ───────────────────────

const EMP_RAW = [
  { id: "20176859", pos: "Picker Staff" },
  { id: "20009555", pos: "Picker Staff" },
  { id: "20025397", pos: "Picker Staff" },
  { id: "20036455", pos: "Dept Manager" },
  { id: "20052355", pos: "O2O Senior" },
  { id: "20106109", pos: "O2O Senior" },
  { id: "20156343", pos: "Cashier Staff" },
  { id: "20175347", pos: "Personal Shopper" },
  { id: "20036242", pos: "Cashier Supervisor" },
  { id: "20194103", pos: "O2O Supervisor" },
  { id: "20194755", pos: "O2O Senior" },
  { id: "20235378", pos: "Personal Shopper" },
  { id: "20238373", pos: "Picker Staff" },
  { id: "20051192", pos: "Cashier Staff" },
  { id: "20003281", pos: "Customer Assistant" },
  { id: "20003355", pos: "Senior Cashier" },
  { id: "20004583", pos: "Senior Cashier" },
  { id: "20005785", pos: "Senior Dept Mgr" },
  { id: "20027494", pos: "Cashier Staff" },
  { id: "20362347", pos: "Store Admin" },
  { id: "20015987", pos: "Sr Store Admin" },
];

const INITIAL_GROUPS = [
  {
    id: "g_o2o",
    name: "O2O Team",
    color: "#1FA8A0", // Humi Teal
    empIds: [
      "20176859",
      "20009555",
      "20025397",
      "20036455",
      "20052355",
      "20106109",
      "20156343",
      "20175347",
      "20194103",
      "20194755",
      "20235378",
      "20238373",
    ],
    ownedBy: "dm_o2o",
    division: "div_ops",
    status: "draft",
    comment: "",
    open: true,
  },
  {
    id: "g_cashier",
    name: "Cashier & Service",
    color: "#6366F1", // Indigo
    empIds: [
      "20036242",
      "20051192",
      "20003281",
      "20003355",
      "20004583",
      "20005785",
      "20027494",
    ],
    ownedBy: "dm_cashier",
    division: "div_ops",
    status: "draft",
    comment: "",
    open: true,
  },
  {
    id: "g_admin",
    name: "Store Admin",
    color: "#F97316", // Orange/Pumpkin
    empIds: ["20362347", "20015987"],
    ownedBy: "dm_admin",
    division: "div_ops",
    status: "draft",
    comment: "",
    open: true,
  },
  {
    id: "g_div",
    name: "Division Manager Team",
    color: "#8B5CF6", // Purple
    empIds: [],
    ownedBy: "div_ops",
    division: "div_ops",
    status: "draft",
    comment: "",
    open: true,
  },
  {
    id: "g_store",
    name: "Store Manager Team",
    color: "#D97706", // Amber
    empIds: [],
    ownedBy: "store",
    division: null,
    status: "draft",
    comment: "",
    open: true,
  },
];

interface RoleConfig {
  label: string;
  level: string;
  ownGroups: string[];
  canViewAll: boolean;
  canApprove?: string[];
  canFinalApprove?: boolean;
}

const ROLES: Record<string, RoleConfig> = {
  dm_o2o: { label: "Dept Mgr — O2O Team", level: "dept", ownGroups: ["g_o2o"], canViewAll: false },
  dm_cashier: { label: "Dept Mgr — Cashier", level: "dept", ownGroups: ["g_cashier"], canViewAll: false },
  dm_admin: { label: "Dept Mgr — Store Admin", level: "dept", ownGroups: ["g_admin"], canViewAll: false },
  div_ops: { label: "Division Mgr — Ops", level: "div", ownGroups: ["g_div"], canViewAll: true, canApprove: ["g_o2o", "g_cashier", "g_admin"] },
  store: { label: "Store Manager", level: "store", ownGroups: ["g_store"], canViewAll: true, canApprove: ["g_div", "g_store"], canFinalApprove: true },
};

// Thai Public Holidays for 2026 (0-indexed month)
const TH_PH: Record<number, Record<number, Record<number, string>>> = {
  2026: {
    0: { 1: "New Year's Day" },
    2: { 6: "Chakri Day (sub.)" },
    3: { 6: "Chakri Day (sub.)", 13: "Songkran", 14: "Songkran", 15: "Songkran" },
    4: { 1: "Labour Day", 4: "Coronation Day", 5: "Coronation Day (sub.)", 18: "Visakha Bucha" },
    6: { 16: "Asanha Bucha", 17: "Buddhist Lent", 28: "King's Birthday (sub.)" },
    7: { 12: "Queen Sirikit's Birthday" },
    8: { 13: "Navami Bucha", 23: "Chulalongkorn Day" },
    9: { 6: "Constitution Day (sub.)" },
    10: { 5: "King Bhumibol Memorial", 10: "Constitution Day", 31: "New Year's Eve" },
  },
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MN_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

// Helper to add minutes to time string HH:MM
function addMinutes(t: string, m: number): string {
  const [h, mi] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(mi)) return t;
  let tot = h * 60 + mi + m;
  tot = ((tot % 1440) + 1440) % 1440;
  return String(Math.floor(tot / 60)).padStart(2, "0") + ":" + String(tot % 60).padStart(2, "0");
}

function getDefaultRole(userRoles: string[]): string {
  if (userRoles.includes('hr_manager') || userRoles.includes('hr_admin')) return 'store';
  if (userRoles.includes('hrbp') || userRoles.includes('spd')) return 'div_ops';
  if (userRoles.includes('manager')) return 'dm_o2o';
  return 'dm_o2o';
}

interface Cell {
  off: boolean;
  start: string;
  otStart?: string;
  otEnd?: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  empIds: string[];
  ownedBy: string;
  division: string | null;
  status: string;
  comment: string;
  open: boolean;
}

export default function ShiftAssignPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';
  const isTh = locale === 'th';

  const userRoles = useAuthStore((s) => s.roles);
  const isHydrated = useAuthStore((s) => s._hasHydrated);

  // States
  const [currentRole, setCurrentRole] = useState('dm_o2o');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // 3 = April (matching HTML index 3)

  const [groups, setGroups] = useState<Group[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('humi-shift-assign-groups');
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_GROUPS;
  });

  const [cellData, setCellData] = useState<Record<string, Cell>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('humi-shift-assign-cells');
      if (saved) return JSON.parse(saved);
    }
    return {};
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('humi-shift-assign-groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('humi-shift-assign-cells', JSON.stringify(cellData));
  }, [cellData]);

  // Sync default role based on current user roles
  useEffect(() => {
    if (isHydrated && userRoles.length > 0) {
      setCurrentRole(getDefaultRole(userRoles));
    }
  }, [isHydrated, userRoles]);

  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastClickedCell, setLastClickedCell] = useState<{ empId: string; day: number } | null>(null);

  // Editor states
  const [startTime, setStartTime] = useState('09:00');
  const [isOff, setIsOff] = useState(false);
  const [addOt, setAddOt] = useState(false);
  const [otStart, setOtStart] = useState('18:00');
  const [otEnd, setOtEnd] = useState('20:00');

  // Return modal states
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTargetGroupId, setReturnTargetGroupId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState('');

  // Pagination states
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const toastMessage = (msg: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Date constants
  const daysCount = new Date(year, month + 1, 0).getDate();
  const holidayMap = useMemo(() => {
    const list = (TH_PH[year]?.[month] || {}) as Record<number, string>;
    const map = new Map<number, string>();
    Object.entries(list).forEach(([d, n]) => {
      map.set(Number(d), n as string);
    });
    return map;
  }, [year, month]);

  // Access checks
  const roleObj = ROLES[currentRole as keyof typeof ROLES] || ROLES.dm_o2o;

  const canView = (groupId: string) => {
    if (roleObj.canViewAll) return true;
    return roleObj.ownGroups.includes(groupId);
  };

  const canEditGroup = (groupId: string) => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return false;
    return roleObj.ownGroups.includes(groupId) && (g.status === 'draft' || g.status === 'inprogress' || g.status === 'returned');
  };

  const getCellKey = (empId: string, d: number) => {
    return `${empId}|${year}|${month}|${d}`;
  };

  // Roster cell selection handlers
  const toggleCell = (empId: string, day: number, e: React.MouseEvent, groupId: string) => {
    if (!canEditGroup(groupId)) return;
    const key = `${empId}__${day}`;
    
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastClickedCell && lastClickedCell.empId === empId) {
        const d1 = Math.min(lastClickedCell.day, day);
        const d2 = Math.max(lastClickedCell.day, day);
        const range = Array.from({ length: d2 - d1 + 1 }, (_, i) => `${empId}__${d1 + i}`);
        const allSelected = range.every((x) => next.has(x));
        range.forEach((x) => {
          if (allSelected) next.delete(x);
          else next.add(x);
        });
      } else {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      }
      return next;
    });

    setLastClickedCell({ empId, day });

    // Change status from draft to inprogress on first edit
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId && g.status === 'draft') {
          return { ...g, status: 'inprogress' };
        }
        return g;
      })
    );
  };

  const removeSelectedCell = (key: string) => {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const selectEmployeeMonth = (empId: string, groupId: string) => {
    if (!canEditGroup(groupId)) return;
    const keys = Array.from({ length: daysCount }, (_, i) => `${empId}__${i + 1}`);
    setSelectedCells((prev) => {
      const next = new Set(prev);
      const allSelected = keys.every((k) => next.has(k));
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
    setLastClickedCell({ empId, day: 1 });
  };

  const selectColumnDay = (groupId: string, day: number) => {
    if (!canEditGroup(groupId)) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const keys = group.empIds.map((empId) => `${empId}__${day}`);
    setSelectedCells((prev) => {
      const next = new Set(prev);
      const allSelected = keys.every((k) => next.has(k));
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const selectAllVisibleMonth = () => {
    const editableGroups = groups.filter((g) => canEditGroup(g.id) && canView(g.id));
    setSelectedCells((prev) => {
      const next = new Set(prev);
      editableGroups.forEach((g) => {
        g.empIds.forEach((empId) => {
          for (let d = 1; d <= daysCount; d++) {
            next.add(`${empId}__${d}`);
          }
        });
      });
      return next;
    });
    toastMessage(isTh ? 'เลือกทุกช่องที่แก้ไขได้ของทั้งเดือนแล้ว' : 'Selected all editable cells for the month', 'success');
  };

  const clearSelection = () => {
    setSelectedCells(new Set());
    setLastClickedCell(null);
  };

  // Editor Actions
  const applyToSelection = () => {
    if (selectedCells.size === 0) {
      toastMessage(isTh ? 'ไม่ได้เลือกช่องใดๆ' : 'No cells selected', 'error');
      return;
    }
    setCellData((prev) => {
      const next = { ...prev };
      selectedCells.forEach((k) => {
        const [empId, dayStr] = k.split('__');
        const d = Number(dayStr);
        next[getCellKey(empId, d)] = {
          off: isOff,
          start: startTime,
          otStart: addOt ? otStart : undefined,
          otEnd: addOt ? otEnd : undefined,
        };
      });
      return next;
    });

    const affectedGroups = new Set<string>();
    selectedCells.forEach((k) => {
      const [empId] = k.split('__');
      const g = groups.find((x) => x.empIds.includes(empId));
      if (g) affectedGroups.add(g.id);
    });

    setGroups((prev) =>
      prev.map((g) => {
        if (affectedGroups.has(g.id) && g.status === 'draft') {
          return { ...g, status: 'inprogress' };
        }
        return g;
      })
    );

    const count = selectedCells.size;
    clearSelection();
    toastMessage(isTh ? `นำไปใช้กับ ${count} ช่องแล้ว` : `Applied to ${count} cells`, 'success');
  };

  const clearSelectedCellsData = () => {
    if (selectedCells.size === 0) {
      toastMessage(isTh ? 'ไม่ได้เลือกช่องใดๆ' : 'No cells selected', 'error');
      return;
    }
    setCellData((prev) => {
      const next = { ...prev };
      selectedCells.forEach((k) => {
        const [empId, dayStr] = k.split('__');
        const d = Number(dayStr);
        delete next[getCellKey(empId, d)];
      });
      return next;
    });

    const affectedGroups = new Set<string>();
    selectedCells.forEach((k) => {
      const [empId] = k.split('__');
      const g = groups.find((x) => x.empIds.includes(empId));
      if (g) affectedGroups.add(g.id);
    });

    setGroups((prev) =>
      prev.map((g) => {
        if (affectedGroups.has(g.id) && g.status === 'draft') {
          return { ...g, status: 'inprogress' };
        }
        return g;
      })
    );

    const count = selectedCells.size;
    clearSelection();
    toastMessage(isTh ? `ล้างค่า ${count} ช่องแล้ว` : `Cleared ${count} cells`, 'success');
  };

  // Workflow submissions / approvals
  const submitGroup = (groupId: string) => {
    const group = groups.find((x) => x.id === groupId);
    if (!group) return;

    const unassigned = group.empIds.filter((empId) => {
      for (let d = 1; d <= daysCount; d++) {
        if (!cellData[getCellKey(empId, d)]) return true;
      }
      return false;
    });

    if (unassigned.length > 0) {
      const confirmMsg = isTh
        ? `มีพนักงาน ${unassigned.length} คนที่มีวันยังไม่ได้จัดกะในเดือนนี้ ยืนยันที่จะส่งตรวจหรือไม่?`
        : `There are ${unassigned.length} employee(s) with unassigned days this month. Do you want to submit anyway?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, status: 'submitted', comment: '' };
        }
        return g;
      })
    );
    toastMessage(isTh ? `ส่งตารางแผนก "${group.name}" เพื่อตรวจสอบแล้ว` : `Submitted "${group.name}" for review`, 'success');
  };

  const approveGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, status: 'approved', comment: '' };
        }
        return g;
      })
    );
    toastMessage(isTh ? `อนุมัติตารางแผนก "${groups.find(g => g.id === groupId)?.name}" แล้ว` : `Approved "${groups.find(g => g.id === groupId)?.name}"`, 'success');
  };

  const handleReturnClick = (groupId: string) => {
    setReturnTargetGroupId(groupId);
    setReturnNote('');
    setReturnModalOpen(true);
  };

  const confirmReturn = () => {
    if (!returnNote.trim() || !returnTargetGroupId) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === returnTargetGroupId) {
          return { ...g, status: 'returned', comment: returnNote.trim() };
        }
        return g;
      })
    );
    setReturnModalOpen(false);
    toastMessage(isTh ? 'ส่งกลับให้แผนกแก้ไขแล้ว' : 'Returned for revision', 'warning');
  };

  const finalApproveAll = () => {
    const allApproved = groups.every((g) => g.status === 'approved' || g.ownedBy === 'store');
    if (!allApproved) {
      toastMessage(isTh ? 'บางกลุ่มยังไม่ได้รับการอนุมัติ กรุณาตรวจสอบก่อน' : 'Some groups are not yet approved. Review them first.', 'error');
      return;
    }
    setGroups((prev) =>
      prev.map((g) => ({ ...g, status: 'approved' }))
    );
    toastMessage(isTh ? 'ล็อกและอนุมัติตารางทั้งหมดในเดือนนี้แล้ว' : 'Schedule locked and approved for the month', 'success');
  };

  const resetAllData = () => {
    if (window.confirm(isTh ? 'คุณต้องการล้างข้อมูลจัดกะทั้งหมดหรือไม่?' : 'Are you sure you want to reset all shift data?')) {
      setGroups(INITIAL_GROUPS);
      setCellData({});
      clearSelection();
      toastMessage(isTh ? 'รีเซ็ตข้อมูลจัดกะเรียบร้อยแล้ว' : 'Shift data reset successfully', 'success');
    }
  };

  // Month navigation
  const handleMonthChange = (direction: number) => {
    let nextMonth = month + direction;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }
    setMonth(nextMonth);
    setYear(nextYear);
    clearSelection();
  };

  // CSV Exporter
  const exportCSV = () => {
    let csv = "\uFEFF";
    csv += "Group,Status,Employee ID,Position";
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(year, month, d);
      const dowStr = DOW[date.getDay()];
      csv += `,${d}/${month + 1}/${year}(${dowStr})`;
    }
    csv += "\n";

    groups.forEach((g) => {
      if (g.empIds.length === 0) return;
      g.empIds.forEach((id) => {
        const emp = EMP_RAW.find((e) => e.id === id) || { pos: "—" };
        csv += `"${g.name}","${g.status}","${id}","${emp.pos}"`;
        for (let d = 1; d <= daysCount; d++) {
          const c = cellData[getCellKey(id, d)];
          if (!c) {
            csv += ",";
          } else {
            const end = addMinutes(c.start, 480);
            const brS = addMinutes(c.start, 240);
            const brE = addMinutes(c.start, 300);
            let val = c.off ? `OFF start:${c.start}` : `${c.start}-${end} break:${brS}-${brE}`;
            if (c.otStart && c.otEnd) {
              val += ` OT:${c.otStart}-${c.otEnd}`;
            }
            csv += `,"${val}"`;
          }
        }
        csv += "\n";
      });

      // Sum Work
      csv += `"${g.name} SUMMARY","","Work manpower",""`;
      for (let d = 1; d <= daysCount; d++) {
        let work = 0;
        g.empIds.forEach((id) => {
          const c = cellData[getCellKey(id, d)];
          if (c && !c.off) work++;
        });
        csv += `,${work}`;
      }
      csv += "\n";

      // Sum Off
      csv += `"${g.name} SUMMARY","","Day off",""`;
      for (let d = 1; d <= daysCount; d++) {
        let off = 0;
        g.empIds.forEach((id) => {
          const c = cellData[getCellKey(id, d)];
          if (c && c.off) off++;
        });
        csv += `,${off}`;
      }
      csv += "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shifts_${year}_${String(month + 1).padStart(2, "0")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastMessage(isTh ? 'ดาวน์โหลดไฟล์ CSV สำเร็จ' : 'CSV download successful', 'success');
  };

  // Deadline calculation
  const today = new Date();
  const deadlineDay = 28;
  const deadlineDate = new Date(year, month, deadlineDay);
  const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Render variables
  const visibleGroups = groups.filter((g) => canView(g.id));
  const pendingApprovalsCount = groups.filter((g) => roleObj.canApprove?.includes(g.id) && g.status === 'submitted').length;

  return (
    <div className="pb-8 flex flex-col gap-6">
      {/* Page Header */}
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {isTh ? 'HUMI • บริหารทีม • จัดกะ' : 'HUMI • TEAM MANAGEMENT • SHIFT ASSIGNMENT'}
        </span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
              {isTh ? 'จัดกะ' : 'Shift'} <span className="italic font-medium text-accent">{isTh ? 'พนักงาน' : 'Assignment'}</span>
            </h1>
            <p className="text-small text-ink-muted mt-1">
              {isTh
                ? 'ระบบการจัดกะพนักงานสำหรับสาขา ควบคุมการอนุมัติและล็อกตารางทำงาน'
                : 'Branch shift scheduling module with strict approval and submission locks.'}
            </p>
          </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-canvas-soft border border-hairline rounded-[var(--radius-md)] p-1 h-8">
            <button
              onClick={() => handleMonthChange(-1)}
              className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-xs text-ink-soft hover:bg-surface transition-colors"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="px-2 font-mono font-semibold text-xs min-w-[100px] text-center text-ink">
              {isTh ? `${MN_TH[month]} ${year + 543}` : `${MN[month]} ${year}`}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-xs text-ink-soft hover:bg-surface transition-colors"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {/* Role Swapper (acting as) */}
          <div className="flex items-center gap-1.5 bg-canvas-soft border border-hairline rounded-[var(--radius-md)] px-2.5 h-8 shadow-sm">
            <span className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint whitespace-nowrap">
              {isTh ? 'ผู้สวมบทบาท' : 'Acting as'}
            </span>
            <select
              value={currentRole}
              onChange={(e) => {
                setCurrentRole(e.target.value);
                clearSelection();
              }}
              className="appearance-none text-small font-semibold bg-transparent border-none text-ink focus:outline-none cursor-pointer"
              style={{
                margin: 0,
                padding: '2px 18px 2px 4px',
                WebkitAppearance: 'none',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'5\' viewBox=\'0 0 8 5\'%3E%3Cpath d=\'M1 1.5l3 3 3-3\' stroke=\'%230E1B2C\' stroke-width=\'1.2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 4px center',
              }}
            >
              <option value="dm_o2o">{isTh ? 'หน. O2O Team' : 'Dept Mgr — O2O'}</option>
              <option value="dm_cashier">{isTh ? 'หน. แคชเชียร์' : 'Dept Mgr — Cashier'}</option>
              <option value="dm_admin">{isTh ? 'หน. แอดมินร้าน' : 'Dept Mgr — Admin'}</option>
              <option value="div_ops">{isTh ? 'ผจก. ฝ่ายปฏิบัติการ' : 'Division Mgr — Ops'}</option>
              <option value="store">{isTh ? 'ผู้จัดการสาขา' : 'Store Manager'}</option>
            </select>
          </div>

          <Button variant="secondary" size="sm" className="text-xs px-2.5" onClick={exportCSV}>
            <FileSpreadsheet size={13} className="mr-1 inline-block" />
            {isTh ? 'ส่งออก CSV' : 'Export CSV'}
          </Button>

          <Button variant="ghost" size="sm" className="text-xs text-danger hover:bg-danger-soft px-2" onClick={resetAllData}>
            {isTh ? 'รีเซ็ต' : 'Reset'}
          </Button>
          </div>
        </div>
      </header>

      {/* Deadline Banner */}
      {roleObj.level === 'store' && (
        <div className="bg-[color:var(--color-danger-soft)] border border-danger rounded-[var(--radius-md)] p-2.5 px-3.5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Clock className="text-danger mt-0.5 flex-shrink-0" size={15} />
            <div>
              <p className="text-xs font-bold text-danger">
                {isTh
                  ? `กำหนดส่งอนุมัติ: 28 ${MN_TH[month]} ${year + 543}`
                  : `Approval deadline: 28 ${MN[month]} ${year}`}
                {' '}·{' '}
                {daysLeft > 0 ? `${daysLeft} ${isTh ? 'วันคงเหลือ' : 'days left'}` : (isTh ? 'ครบกำหนดวันนี้' : 'Due today')}
              </p>
              <p className="text-[10px] text-ink-muted mt-0.5">
                {isTh
                  ? `มีแผนกที่รอคุณอนุมัติทั้งหมด ${groups.filter(g => g.status !== 'approved' && g.ownedBy !== 'store').length} กลุ่ม`
                  : `There are ${groups.filter(g => g.status !== 'approved' && g.ownedBy !== 'store').length} group(s) awaiting approval`}
              </p>
            </div>
          </div>
          {groups.filter(g => g.status !== 'approved' && g.ownedBy !== 'store').length === 0 && (
            <Button variant="primary" size="sm" className="h-7 text-xs px-2.5" onClick={finalApproveAll}>
              <Lock size={12} className="mr-1 inline-block" />
              {isTh ? 'ล็อกและอนุมัติตารางทั้งหมด' : 'Lock & approve all'}
            </Button>
          )}
        </div>
      )}

      {roleObj.level === 'dept' && (
        <div className="bg-[color:var(--color-danger-soft)] border border-danger border-opacity-40 rounded-[var(--radius-md)] p-2.5 px-3.5 flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="text-danger mt-0.5 flex-shrink-0" size={15} />
          <div>
            <p className="text-xs font-bold text-danger">
              {isTh
                ? `ส่งตารางภายในกำหนด: วันที่ 28 ${MN_TH[month]}`
                : `Submit roster by 28th ${MN[month]}`}
            </p>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {isTh
                ? 'กรุณากรอกตารางกะของทีมให้ครบถ้วนและกดปุ่ม "ส่งตรวจ" เพื่อส่งให้ผู้จัดการฝ่ายปฏิบัติการอนุมัติ'
                : 'Please complete your department shift scheduling and click "Submit for review" to send it to the Division Manager.'}
            </p>
          </div>
        </div>
      )}

      {roleObj.level === 'div' && pendingApprovalsCount > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-[var(--radius-md)] p-2.5 px-3.5 flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="text-indigo-600 mt-0.5 flex-shrink-0" size={15} />
          <div>
            <p className="text-xs font-bold text-indigo-700">
              {isTh
                ? `มีตารางจัดกะ ${pendingApprovalsCount} แผนกที่รอคุณตรวจสอบ`
                : `${pendingApprovalsCount} department roster(s) awaiting your review`}
            </p>
            <p className="text-[10px] text-indigo-900 text-opacity-80 mt-0.5">
              {isTh
                ? `กรุณาพิจารณาอนุมัติหรือส่งกลับเพื่อแก้ไข ภายในกำหนดส่งวันที่ 28 ${MN_TH[month]}`
                : `Please review, approve, or return them with notes by the 28th of ${MN[month]}.`}
            </p>
          </div>
        </div>
      )}

      {/* Workflow strip */}
      <Card className="p-4 shadow-[var(--shadow-card)]">
        <h2 className="font-mono text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-3">
          {isTh ? 'ความคืบหน้าการจัดกะของแผนกต่างๆ' : 'Department Submission Progress'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {visibleGroups.map((g) => {
            // Calculate actual progress percentage (assigned cells / total cells)
            const getGroupProgress = (group: Group) => {
              if (group.empIds.length === 0) return 0;
              const totalCells = group.empIds.length * daysCount;
              let filledCount = 0;
              group.empIds.forEach((empId) => {
                for (let d = 1; d <= daysCount; d++) {
                  if (cellData[`${empId}|${year}|${month}|${d}`]) {
                    filledCount++;
                  }
                }
              });
              return totalCells > 0 ? Math.round((filledCount / totalCells) * 100) : 0;
            };

            const pct = getGroupProgress(g);
            const barBg = g.status === 'approved' ? 'bg-accent' : g.status === 'submitted' ? 'bg-indigo-600' : g.status === 'returned' ? 'bg-danger' : g.status === 'inprogress' ? 'bg-amber-500' : 'bg-gray-300';
            return (
              <div key={g.id} className="border border-hairline rounded-[var(--radius-md)] overflow-hidden shadow-sm flex flex-col justify-between bg-surface">
                <div className="p-2 bg-canvas-soft border-b border-hairline flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="font-semibold text-xs text-ink truncate">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-mono text-[9px] font-bold text-ink-muted">{pct}%</span>
                  {g.status === 'approved' && (
                    <span className="px-2 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-accent-soft text-accent">
                      {isTh ? 'อนุมัติ' : 'Approved'}
                    </span>
                  )}
                  {g.status === 'submitted' && (
                    <span className="px-2 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-info-soft)] text-[color:var(--color-info)]">
                      {isTh ? 'ส่งแล้ว' : 'Submitted'}
                    </span>
                  )}
                  {g.status === 'returned' && (
                    <span className="px-2 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger-ink)]">
                      {isTh ? 'ส่งคืน' : 'Returned'}
                    </span>
                  )}
                  {g.status === 'inprogress' && (
                    <span className="px-2 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-warning-soft)] text-ink">
                      {isTh ? 'กำลังทำ' : 'In Progress'}
                    </span>
                  )}
                  {g.status === 'draft' && (
                    <span className="px-2 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-canvas-soft text-ink-muted border border-hairline">
                      {isTh ? 'ร่าง' : 'Draft'}
                    </span>
                  )}
                </div>
              </div>
                
                <div className="w-full bg-canvas h-1">
                  <div className={`h-full ${barBg} transition-all`} style={{ width: `${pct}%` }} />
                </div>

                {g.comment && g.status === 'returned' && (
                  <div className="p-1.5 bg-[color:var(--color-danger-soft)] border-t border-[color:var(--color-danger-soft)] text-[10px] text-danger flex items-start gap-1 font-sans">
                    <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                    <span className="truncate" title={g.comment}>{g.comment}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Editor Panel (visible only if editing permission is active on at least one owned group) */}
      {groups.some(g => canEditGroup(g.id) && canView(g.id)) && (
        <div className="bg-surface border border-hairline rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="border-b border-hairline bg-canvas-soft px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[length:var(--text-display-h3)] font-semibold text-ink">{isTh ? 'เครื่องมือจัดกะพนักงาน' : 'Shift Editor'}</h3>
              <p className="text-small text-ink-muted mt-0.5">
                {selectedCells.size > 0
                  ? isTh ? `เลือกแล้ว ${selectedCells.size} ช่อง` : `${selectedCells.size} cells selected`
                  : isTh ? 'เลือกช่องในตารางด้านล่างเพื่อทำการจัดกะแบบกลุ่ม' : 'Select cells in the grid below to assign shifts.'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={selectAllVisibleMonth}>
                {isTh ? 'เลือกทั้งเดือน' : 'Select whole month'}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={clearSelection} disabled={selectedCells.size === 0}>
                {isTh ? 'ยกเลิกเลือก' : 'Deselect all'}
              </Button>
            </div>
          </div>
          <div className="p-3.5 px-4">
            {/* Selected chips */}
            {selectedCells.size > 0 && (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto mb-4 p-2.5 bg-canvas-soft rounded-[var(--radius-md)] border border-hairline">
                {selectedCells.size > 16 ? (
                  <span className="inline-flex items-center gap-1 bg-surface border border-hairline px-3 py-1 rounded-full text-xs font-mono text-ink-soft">
                    {selectedCells.size} {isTh ? 'ช่องที่เลือก' : 'cells'}
                    <button onClick={clearSelection} className="text-ink-muted hover:text-danger ml-1 font-bold">×</button>
                  </span>
                ) : (
                  Array.from(selectedCells).map((key) => {
                    const [empId, dayStr] = key.split('__');
                    const d = Number(dayStr);
                    const shortMonth = isTh ? MN_TH[month].slice(0, 3) : MN[month].slice(0, 3);
                    return (
                      <span key={key} className="inline-flex items-center gap-1 bg-surface border border-hairline px-2.5 py-1 rounded-full text-xs font-mono text-ink-soft">
                        {empId}·{d} {shortMonth}
                        <button onClick={() => removeSelectedCell(key)} className="text-ink-muted hover:text-danger ml-1 font-bold">×</button>
                      </span>
                    );
                  })
                )}
              </div>
            )}

            {/* Inputs grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-ink-muted uppercase tracking-[0.04em]">{isTh ? 'เวลาเริ่มงาน' : 'Start Time'}</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent appearance-none -webkit-appearance-none"
                  style={{
                    backgroundImage: 'url("data:image/svg+xml;utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%230E1B2C\' stroke-width=\'1.2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '20px'
                  }}
                >
                  {Array.from({ length: 27 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 1;
                    const mins = i % 2 === 0 ? '00' : '30';
                    const tStr = `${String(hour).padStart(2, '0')}:${mins}`;
                    return <option key={tStr} value={tStr}>{tStr}</option>;
                  })}
                </select>
              </div>

              {/* Combined Day off and Add OT in the same row */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 md:col-span-2 pb-0.5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOff}
                        onChange={(e) => setIsOff(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative flex-shrink-0 w-8 h-5 bg-canvas-soft border border-hairline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                    <span className="text-xs font-semibold text-ink">{isTh ? 'วันหยุด (Off)' : 'Day off'}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">{isTh ? 'บันทึกเวลาเริ่มไว้ในระบบ' : 'Start time still recorded'}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addOt}
                        onChange={(e) => setAddOt(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative flex-shrink-0 w-8 h-5 bg-canvas-soft border border-hairline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                    <span className="text-xs font-semibold text-ink">{isTh ? 'เพิ่ม OT' : 'Add OT'}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted">{isTh ? 'ขอ OT ในวันหยุดทำงานได้' : 'Day off + OT allowed'}</span>
                </div>
              </div>

              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-7 text-xs text-danger border-danger hover:bg-danger-soft transition-colors"
                  onClick={clearSelectedCellsData}
                  disabled={selectedCells.size === 0}
                >
                  {isTh ? 'ล้างกะ' : 'Clear'}
                </Button>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={applyToSelection}
                  disabled={selectedCells.size === 0}
                >
                  {isTh ? `บันทึก (${selectedCells.size} ช่อง)` : `Apply to ${selectedCells.size}`}
                </Button>
              </div>
            </div>

            {/* OT Settings Panel */}
            {addOt && (
              <div className="mt-3 p-3 rounded-[var(--radius-md)] border border-[color:var(--color-danger-soft)] bg-[color:var(--color-danger-soft)] bg-opacity-35">
                <span className="text-[10px] font-bold text-danger uppercase tracking-[0.04em]">{isTh ? 'กำหนดช่วงเวลาทำ OT (ล่วงเวลา)' : 'Overtime Period'}</span>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-ink-muted">{isTh ? 'เริ่ม OT' : 'OT Start'}</label>
                    <input
                      type="time"
                      value={otStart}
                      onChange={(e) => setOtStart(e.target.value)}
                      className="p-1.5 rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink font-mono text-xs focus:outline-none appearance-none -webkit-appearance-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-ink-muted">{isTh ? 'สิ้นสุด OT' : 'OT End'}</label>
                    <input
                      type="time"
                      value={otEnd}
                      onChange={(e) => setOtEnd(e.target.value)}
                      className="p-1.5 rounded-[var(--radius-sm)] border border-hairline bg-surface text-ink font-mono text-xs focus:outline-none appearance-none -webkit-appearance-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview Box */}
            <div className="mt-3 p-2.5 px-3 bg-[color:var(--color-accent-soft)] rounded-[var(--radius-md)] border border-accent text-xs text-ink-soft leading-relaxed flex flex-wrap items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${isOff ? 'bg-canvas border border-hairline text-ink-muted' : 'bg-accent text-white'}`}>
                {isOff ? (isTh ? 'วันหยุด' : 'Day off') : (isTh ? 'ปฏิบัติงาน' : 'Working')}
              </span>
              <span>
                {isTh ? 'กะเวลาเริ่มงาน' : 'Start'} <strong className="font-mono font-semibold text-ink">{startTime}</strong>
                {!isOff ? (
                  <>
                    {' '}{isTh ? 'ถึง' : '→'}{' '}
                    <strong className="font-mono font-semibold text-ink">{addMinutes(startTime, 480)}</strong>
                    {' '}&nbsp;·&nbsp;{' '}
                    {isTh ? 'พัก' : 'Break'} <strong className="font-mono text-ink-muted">{addMinutes(startTime, 240)}–{addMinutes(startTime, 300)}</strong>
                  </>
                ) : (
                  <span className="text-ink-muted"> ({isTh ? 'บันทึกเวลาเข้าระบบปกติ' : 'recorded for system'})</span>
                )}
                {addOt && otStart && otEnd && (
                  <>
                    {' '}&nbsp;·&nbsp;{' '}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger text-white uppercase">OT</span>
                    {' '}
                    <strong className="font-mono font-semibold text-ink">{otStart}–{otEnd}</strong>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-hairline mt-3 pt-3 text-[10px] text-ink-muted">
              <span>{isTh ? 'แก้ไขกะพนักงานในวันร่างหรือถูกตีกลับเท่านั้น · ใช้ปุ่มล้างค่าเพื่อลบกะ' : 'Edit shifts in Draft or Returned status only. Use clear to delete shifts.'}</span>
              <span className="font-mono font-semibold text-ink">{selectedCells.size > 0 ? `${selectedCells.size} cells` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Roster Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[color:var(--color-accent-soft)] border border-accent" />
          <span>{isTh ? 'วันทำงานปกติ' : 'Working'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-canvas border border-hairline-soft" />
          <span>{isTh ? 'วันหยุด' : 'Day off'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[color:var(--color-danger-soft)] border border-danger" />
          <span>{isTh ? 'วันหยุดนักขัตฤกษ์' : 'Public holiday'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-canvas-soft border border-hairline opacity-70" />
          <span>{isTh ? 'อ่านอย่างเดียว' : 'Read-only'}</span>
        </div>
      </div>

      {/* Roster Grids (Group by Group) */}
      {visibleGroups.map((g) => {
        if (g.empIds.length === 0) return null;
        
        const editable = canEditGroup(g.id);
        const isOpen = g.open !== false;
        
        // Pagination setup
        const currentPage = groupPages[g.id] ?? 0;
        const itemsPerPage = 8;
        const totalPages = Math.ceil(g.empIds.length / itemsPerPage) || 1;
        const pagedEmpIds = g.empIds.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

        // Group status controls
        const canSubmit = roleObj.ownGroups.includes(g.id) && (g.status === 'draft' || g.status === 'inprogress' || g.status === 'returned');
        const isApprover = roleObj.canApprove?.includes(g.id) || roleObj.canFinalApprove;
        const canApproveDept = isApprover && g.status === 'submitted';
        const isLocked = g.status === 'approved';

        const toggleGroupOpen = (groupId: string) => {
          setGroups((prev) =>
            prev.map((x) => {
              if (x.id === groupId) return { ...x, open: !x.open };
              return x;
            })
          );
        };

        const changePage = (groupId: string, direction: number) => {
          setGroupPages((prev) => {
            const current = prev[groupId] ?? 0;
            const next = Math.max(0, Math.min(totalPages - 1, current + direction));
            return { ...prev, [groupId]: next };
          });
        };

        return (
          <div key={g.id} className="bg-surface border border-hairline rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
            {/* Group Title Bar */}
            <div className={`px-4 py-3 border-b border-hairline flex flex-wrap items-center justify-between gap-2.5 ${isLocked ? 'bg-accent-soft bg-opacity-30' : g.status === 'returned' ? 'bg-[color:var(--color-danger-soft)] bg-opacity-30' : 'bg-surface'}`}>
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                <div>
                  <h3 className="font-display text-[length:var(--text-display-h3)] font-semibold leading-[var(--text-display-h3--line-height)] text-ink" style={{ color: isLocked ? 'var(--color-accent)' : undefined }}>{g.name}</h3>
                  <p className="text-small text-ink-muted mt-0.5">
                    {isTh ? 'ผู้ดูแล:' : 'Owner:'} {ROLES[g.ownedBy as keyof typeof ROLES]?.label || g.ownedBy} · {g.empIds.length} {isTh ? 'คน' : 'employees'}
                  </p>
                </div>
              </div>

              {/* Department Actions */}
              <div className="flex items-center gap-2">
                {g.status === 'approved' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-accent-soft text-accent flex items-center gap-1">
                    <Lock size={10} />
                    {isTh ? 'ล็อกแล้ว' : 'Locked'}
                  </span>
                )}
                {g.status === 'submitted' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-info-soft)] text-[color:var(--color-info)]">
                    {isTh ? 'ส่งพิจารณา' : 'Submitted'}
                  </span>
                )}
                {g.status === 'returned' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger-ink)]">
                    {isTh ? 'ส่งกลับแก้ไข' : 'Returned'}
                  </span>
                )}
                {g.status === 'inprogress' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-[color:var(--color-warning-soft)] text-ink">
                    {isTh ? 'กำลังจัดตาราง' : 'In Progress'}
                  </span>
                )}
                {g.status === 'draft' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[length:var(--text-eyebrow)] font-semibold bg-canvas-soft text-ink-muted border border-hairline">
                    {isTh ? 'ฉบับร่าง' : 'Draft'}
                  </span>
                )}

                {canSubmit && (
                  <Button variant="primary" size="sm" onClick={() => submitGroup(g.id)}>
                    {isTh ? 'ส่งตรวจตารางกะ' : 'Submit for Review'}
                  </Button>
                )}
                {canApproveDept && (
                  <>
                    <Button variant="secondary" size="sm" className="text-danger border-danger hover:bg-danger-soft" onClick={() => handleReturnClick(g.id)}>
                      {isTh ? 'ส่งกลับแก้ไข' : 'Return'}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => approveGroup(g.id)}>
                      {isTh ? 'อนุมัติ' : 'Approve'}
                    </Button>
                  </>
                )}
                {!editable && !isLocked && g.status !== 'submitted' && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted px-2">
                    <Eye size={14} className="text-ink-muted" />
                    {isTh ? 'อ่านอย่างเดียว' : 'View only'}
                  </span>
                )}

                {editable && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="ml-2 bg-accent-soft bg-opacity-35 hover:bg-accent-soft text-accent border-accent"
                    onClick={() => {
                      const keys: string[] = [];
                      g.empIds.forEach((empId) => {
                        for (let d = 1; d <= daysCount; d++) {
                          keys.push(`${empId}__${d}`);
                        }
                      });
                      setSelectedCells((prev) => {
                        const next = new Set(prev);
                        const allSelected = keys.every(k => next.has(k));
                        keys.forEach(k => {
                          if (allSelected) next.delete(k);
                          else next.add(k);
                        });
                        return next;
                      });
                    }}
                  >
                    {isTh ? 'เลือกทั้งเดือน' : 'Select whole month'}
                  </Button>
                )}

                <button
                  onClick={() => toggleGroupOpen(g.id)}
                  className="p-1 text-ink-muted hover:text-ink transition-colors ml-2"
                >
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {/* Revision Note Banner if returned */}
            {g.status === 'returned' && g.comment && (
              <div className="bg-[color:var(--color-danger-soft)] px-5 py-2.5 text-xs text-danger font-sans border-b border-hairline flex items-start gap-2">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{isTh ? 'ข้อสังเกตการส่งกลับแก้ไข:' : 'Revision Note:'}</strong> {g.comment}
                </span>
              </div>
            )}

            {/* Roster Grid Content */}
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'auto', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-canvas text-left px-3 py-2 border-r border-b border-hairline text-[10px] font-bold text-ink-muted uppercase tracking-wider" style={{ minWidth: 120, width: 120 }}>
                        {isTh ? 'พนักงาน' : 'Employee ID'}
                      </th>
                      {Array.from({ length: daysCount }, (_, i) => {
                        const d = i + 1;
                        const date = new Date(year, month, d);
                        const dow = date.getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        const isHoliday = holidayMap.has(d);
                        const holidayName = holidayMap.get(d);
                        
                        return (
                          <th
                            key={d}
                            onClick={() => selectColumnDay(g.id, d)}
                            className={`cursor-pointer hover:bg-canvas-soft text-center py-1 px-0.5 text-xs border-r border-b border-hairline select-none font-mono ${isWeekend ? 'bg-canvas-soft text-ink-muted' : 'bg-surface text-ink'} ${isHoliday ? 'bg-[color:var(--color-danger-soft)] text-danger border-b border-b-danger' : ''}`}
                            style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                            title={isHoliday ? holidayName : undefined}
                          >
                            <div className="font-bold text-xs leading-tight">{d}</div>
                            <div className="text-[9px] text-ink-muted leading-none">
                              {isTh
                                ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][dow]
                                : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dow]}
                            </div>
                            {isHoliday && (
                              <span className="block text-[6.5px] text-danger font-semibold truncate max-w-[32px] mx-auto mt-0.5" title={holidayName}>
                                {holidayName}
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEmpIds.map((empId) => {
                      const emp = EMP_RAW.find((e) => e.id === empId) || { pos: '—' };
                      const allKeys = Array.from({ length: daysCount }, (_, i) => `${empId}__${i + 1}`);
                      const allSelected = allKeys.every(k => selectedCells.has(k));

                      return (
                        <tr key={empId} className="hover:bg-canvas-soft hover:bg-opacity-50">
                          {/* Row Header sticky left */}
                          <td className={`sticky left-0 z-10 bg-surface border-r border-b border-hairline px-2.5 py-1 text-left shadow-[2px_0_4px_rgba(0,0,0,0.02)] ${allKeys.some(k => selectedCells.has(k)) ? 'bg-accent-soft bg-opacity-20' : ''}`} style={{ minWidth: 120, width: 120 }}>
                            <div className="font-mono font-bold text-xs text-ink leading-tight">{empId}</div>
                            <div className="text-[9px] text-ink-muted truncate leading-tight">{emp.pos}</div>
                            {editable && (
                              <button
                                onClick={() => selectEmployeeMonth(empId, g.id)}
                                className="text-[8.5px] font-bold text-accent hover:underline mt-0.5 block text-left leading-none"
                              >
                                {allSelected ? (isTh ? '✓ ยกเลิกเลือก' : '✓ Deselect') : (isTh ? '+ เลือกทั้งเดือน' : '+ Select Month')}
                              </button>
                            )}
                          </td>

                          {/* Days Cells */}
                          {Array.from({ length: daysCount }, (_, i) => {
                            const d = i + 1;
                            const key = `${empId}__${d}`;
                            const isSelected = selectedCells.has(key);
                            const cell = cellData[getCellKey(empId, d)];
                            const dow = new Date(year, month, d).getDay();
                            const isWeekend = dow === 0 || dow === 6;
                            const isHoliday = holidayMap.has(d);

                            // Build inner element
                            let inner = <span className="text-ink-muted text-opacity-30">·</span>;
                            let cellStyle: React.CSSProperties = {};

                            if (cell) {
                              const hasOT = !!(cell.otStart && cell.otEnd);
                              const end = addMinutes(cell.start, 480);
                              
                              if (hasOT) {
                                cellStyle = { borderBottom: '3px solid var(--color-danger)' }; // pumpkin orange OT border
                              }

                              inner = cell.off ? (
                                <div className="text-[8px] leading-none font-bold text-ink-muted">
                                  <div>OFF</div>
                                  <div className="text-[7.5px] font-normal mt-0.5">{cell.start}</div>
                                </div>
                              ) : (
                                <div className="text-[8px] leading-none font-bold text-accent">
                                  <div>{cell.start}</div>
                                  <div className="text-[7.5px] font-normal text-ink-soft mt-0.5">{end}</div>
                                </div>
                              );
                            }

                            // Class logic
                            let cellClass = 'text-center p-0.5 w-9 min-w-9 max-w-9 border-r border-b border-hairline-soft font-mono select-none h-9 ';
                            if (isSelected && editable) {
                              cellClass += 'bg-[color:var(--color-accent-soft)] ring-2 ring-accent ring-inset ';
                            } else if (isHoliday) {
                              cellClass += 'bg-[color:var(--color-danger-soft)] ';
                            } else if (isWeekend) {
                              cellClass += 'bg-canvas-soft ';
                            } else {
                              cellClass += 'bg-surface ';
                            }

                            if (!editable) {
                              cellClass += 'cursor-default opacity-85 ';
                            } else {
                              cellClass += 'cursor-pointer hover:bg-canvas ';
                            }

                            return (
                              <td
                                key={d}
                                className={cellClass}
                                style={cellStyle}
                                onClick={(e) => {
                                  if (editable) toggleCell(empId, d, e, g.id);
                                }}
                              >
                                {inner}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Summary row - Work manpower */}
                    <tr className="bg-[color:var(--color-accent-soft)] bg-opacity-30 text-[9px] font-mono text-ink">
                      <td className="sticky left-0 z-10 bg-[color:var(--color-accent-soft)] px-2.5 py-1 border-r border-b border-hairline font-sans font-bold text-accent text-[9.5px]" style={{ minWidth: 120, width: 120 }}>
                        {isTh ? 'กำลังพลปฏิบัติงาน' : 'Work manpower'}
                      </td>
                      {Array.from({ length: daysCount }, (_, i) => {
                        const d = i + 1;
                        let workCount = 0;
                        g.empIds.forEach((empId) => {
                          const cell = cellData[getCellKey(empId, d)];
                          if (cell && !cell.off) {
                            workCount++;
                          }
                        });
                        return (
                          <td key={d} className="text-center py-1 border-r border-b border-hairline text-accent font-bold" style={{ width: 36, minWidth: 36, maxWidth: 36 }}>
                            {workCount > 0 ? workCount : '·'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Summary row - Day off */}
                    <tr className="bg-canvas-soft text-[9px] font-mono text-ink">
                      <td className="sticky left-0 z-10 bg-canvas px-2.5 py-1 border-r border-b border-hairline font-sans font-bold text-ink-muted text-[9.5px]" style={{ minWidth: 120, width: 120 }}>
                        {isTh ? 'วันหยุด (OFF)' : 'Day off'}
                      </td>
                      {Array.from({ length: daysCount }, (_, i) => {
                        const d = i + 1;
                        let offCount = 0;
                        g.empIds.forEach((empId) => {
                          const cell = cellData[getCellKey(empId, d)];
                          if (cell && cell.off) {
                            offCount++;
                          }
                        });
                        return (
                          <td key={d} className="text-center py-1 border-r border-b border-hairline text-ink-muted" style={{ width: 36, minWidth: 36, maxWidth: 36 }}>
                            {offCount > 0 ? offCount : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {isOpen && totalPages > 1 && (
              <div className="px-4 py-2 border-t border-hairline bg-canvas-soft flex items-center justify-between text-[11px] text-ink-muted">
                <span className="font-mono">
                  {isTh
                    ? `แสดงแถวที่ ${currentPage * itemsPerPage + 1}–${Math.min((currentPage + 1) * itemsPerPage, g.empIds.length)} จากทั้งหมด ${g.empIds.length}`
                    : `Showing ${currentPage * itemsPerPage + 1}–${Math.min((currentPage + 1) * itemsPerPage, g.empIds.length)} of ${g.empIds.length}`}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => changePage(g.id, -1)}
                    disabled={currentPage === 0}
                  >
                    {isTh ? '‹ ก่อนหน้า' : '‹ Prev'}
                  </Button>
                  <span className="font-mono">
                    {isTh ? `หน้า ${currentPage + 1} / ${totalPages}` : `Page ${currentPage + 1} / ${totalPages}`}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => changePage(g.id, 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    {isTh ? 'ถัดไป ›' : 'Next ›'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Return Note Modal Dialog */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4">
          <div className="bg-surface border border-hairline rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-ink">
              {isTh ? 'ระบุสาเหตุการส่งกลับแก้ไข' : 'Return for Revision'}
            </h3>
            <p className="text-sm text-ink-muted">
              {isTh
                ? 'กรุณากรอกเหตุผลหรือข้อแนะนำให้กับหัวหน้าแผนกรับทราบเพื่อแก้ไขตารางจัดกะกะนี้'
                : 'Leave a note explaining what needs to be fixed in the roster.'}
            </p>
            <textarea
              rows={4}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder={isTh ? 'เช่น มีการจัดวันหยุดชนกันในวันเสาร์-อาทิตย์มากเกินไป กรุณาเฉลี่ยวันทำงาน' : 'e.g. Too many day-offs on weekends. Please balance.'}
              className="w-full text-sm p-3 border border-hairline rounded-[var(--radius-md)] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-ink resize-none font-sans"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setReturnModalOpen(false)}>
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-danger border-danger hover:bg-danger-soft hover:text-danger text-white"
                disabled={!returnNote.trim()}
                onClick={confirmReturn}
              >
                {isTh ? 'ส่งกลับแก้ไข' : 'Return Roster'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast floating notifications */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[999] px-4 py-3 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] border text-sm font-semibold flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-accent-soft text-accent border-accent' :
          toast.type === 'warning' ? 'bg-[color:var(--color-danger-soft)] text-danger border-danger' :
          'bg-[color:var(--color-danger-soft)] text-danger border-danger'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
