'use client';

// ClockLogMapModal — a synthetic <canvas> map for a single clock punch (STA-195).
// NO real map tiles / geolocation: it draws the work location, the 200 m geofence
// circle, and the clock pin (pumpkin when out of radius, never red). Every colour
// is read from a Humi/map token at draw time (no raw hex, transparency via
// globalAlpha); drawMap is guarded for jsdom (null 2D context).

import { useEffect, useRef } from 'react';
import { Modal } from '@/components/humi';
import { GEOFENCE_RADIUS_M } from '@/lib/time/geo';
import type { ClockLogEntry } from '@/lib/time/clock-log-seed';
import { fmtDayShort } from './format';

function tokenColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function drawMap(canvas: HTMLCanvasElement, e: ClockLogEntry) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // jsdom / unsupported — nothing to draw, modal still opens.

  const accent = tokenColor('--color-accent', 'teal');
  const danger = tokenColor('--color-danger', 'orange');
  const info = tokenColor('--color-info', 'royalblue');
  const mapBg = tokenColor('--map-canvas-bg', 'honeydew');
  const grid = tokenColor('--map-grid', 'gainsboro');
  const road = tokenColor('--map-road', 'silver');
  const ok = e.withinRadius;
  const pinColor = ok ? accent : danger;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const midLat = (e.lat + e.workLat) / 2;
  const midLng = (e.lng + e.workLng) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const padding = Math.max(e.distanceM * 1.6, GEOFENCE_RADIUS_M * 2.2);
  const metersPerPx = (padding * 2) / Math.min(W, H);
  const toXY = (lat: number, lng: number) => ({
    x: W / 2 + ((lng - midLng) * 111000 * cosLat) / metersPerPx,
    y: H / 2 - ((lat - midLat) * 111000) / metersPerPx,
  });
  const wp = toXY(e.workLat, e.workLng);
  const cp = toXY(e.lat, e.lng);
  const geoR = GEOFENCE_RADIUS_M / metersPerPx;

  // Background + street grid.
  ctx.fillStyle = mapBg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  const step = Math.round(100 / metersPerPx);
  if (step > 8) {
    for (let x = (W / 2) % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = (H / 2) % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  ctx.strokeStyle = road;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, H * 0.38); ctx.lineTo(W, H * 0.38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.42, 0); ctx.lineTo(W * 0.42, H); ctx.stroke();

  // Geofence circle (indigo fill + dashed border) — alpha via globalAlpha.
  ctx.beginPath(); ctx.arc(wp.x, wp.y, geoR, 0, Math.PI * 2);
  ctx.globalAlpha = 0.1; ctx.fillStyle = info; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(wp.x, wp.y, geoR, 0, Math.PI * 2);
  ctx.strokeStyle = info; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);

  // Line work → clock + distance label.
  if (e.distanceM > 5) {
    ctx.beginPath(); ctx.moveTo(wp.x, wp.y); ctx.lineTo(cp.x, cp.y);
    ctx.strokeStyle = pinColor; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    const mx = (wp.x + cp.x) / 2, my = (wp.y + cp.y) / 2;
    const label = `${e.distanceM} ม.`;
    ctx.font = 'bold 11px sans-serif';
    const lw = ctx.measureText(label).width;
    ctx.globalAlpha = 0.85; ctx.fillStyle = 'white';
    ctx.fillRect(mx - lw / 2 - 4, my - 9, lw + 8, 16);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pinColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  }

  // Work-location marker (indigo).
  ctx.beginPath(); ctx.arc(wp.x, wp.y, 14, 0, Math.PI * 2); ctx.fillStyle = info; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white'; ctx.fillText('🏢', wp.x, wp.y);

  // Clock marker (accent when ok / pumpkin when out of radius).
  ctx.beginPath(); ctx.arc(cp.x, cp.y, 12, 0, Math.PI * 2); ctx.fillStyle = pinColor; ctx.fill();
  ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = '11px sans-serif'; ctx.fillStyle = 'white';
  ctx.fillText(e.type === 'in' ? '▶' : '⏹', cp.x, cp.y);
}

export function ClockLogMapModal({
  entry,
  isTh,
  onClose,
}: {
  entry: ClockLogEntry | null;
  isTh: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (entry && canvasRef.current) drawMap(canvasRef.current, entry);
  }, [entry]);

  const ok = entry?.withinRadius ?? true;
  const typeLabel = entry ? (entry.type === 'in' ? 'Clock In' : 'Clock Out') : '';
  const title = entry ? `${typeLabel} — ${fmtDayShort(entry.date, isTh)}` : '';
  const distClass = `text-base font-semibold ${ok ? 'text-accent' : 'text-danger'}`;

  return (
    <Modal open={entry !== null} onClose={onClose} title={title} widthClass="max-w-xl">
      {entry && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">{entry.time} · {entry.placeName ?? (isTh ? 'ไม่พบชื่อสถานที่' : 'Unknown place')}</p>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-hairline bg-canvas-soft">
            <canvas ref={canvasRef} width={540} height={280} className="w-full" style={{ height: 280 }} />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-ink">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-info)' }} />Work Location</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-[var(--color-info)] bg-info-soft" />{isTh ? 'รัศมี Geofence (200 ม.)' : 'Geofence (200 m)'}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: ok ? 'var(--color-accent)' : 'var(--color-danger)' }} />{typeLabel} {ok ? (isTh ? '(ในรัศมี)' : '(in radius)') : (isTh ? '(นอกรัศมี)' : '(out of radius)')}</span>
          </div>
          {/* Info row */}
          <div className="flex flex-wrap gap-6 border-t border-hairline pt-3">
            <div>
              <p className="text-xs text-ink-muted">{isTh ? 'ระยะห่างจาก Work Location' : 'Distance from work'}</p>
              <p className={distClass}>{entry.distanceM} {isTh ? 'เมตร' : 'm'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{isTh ? 'รัศมี Geofence' : 'Geofence radius'}</p>
              <p className="text-base font-semibold text-[var(--color-info)]">200 {isTh ? 'เมตร' : 'm'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">{isTh ? 'สถานะ' : 'Status'}</p>
              <p className={distClass}>{ok ? (isTh ? '✓ ในรัศมี' : '✓ In radius') : (isTh ? '⚠ นอกรัศมี' : '⚠ Out of radius')}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
