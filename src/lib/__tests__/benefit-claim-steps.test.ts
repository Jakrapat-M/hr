import { describe, it, expect } from 'vitest';
import { claimPipeline } from '@/lib/benefit-claim-steps';

describe('claimPipeline — referrals (status-faithful 3-node forward pipeline)', () => {
  it('pending_spd → node 0, 3 steps, no rework', () => {
    const p = claimPipeline('referral', 'pending_spd');
    expect(p.steps).toEqual(['รอ HRBP', 'SPD ตรวจ', 'รอออกใบ']);
    expect(p.steps.length).toBe(3);
    expect(p.activeIndex).toBe(0);
    expect(p.rework).toBeUndefined();
  });

  it('spd_reviewing → node 1', () => {
    const p = claimPipeline('referral', 'spd_reviewing');
    expect(p.activeIndex).toBe(1);
    expect(p.rework).toBeUndefined();
  });

  it('approved → node 2 (รอออกใบ)', () => {
    const p = claimPipeline('referral', 'approved');
    expect(p.activeIndex).toBe(2);
    expect(p.rework).toBeUndefined();
  });

  it('send_back → rework flag (NOT the final node)', () => {
    const p = claimPipeline('referral', 'send_back');
    expect(p.rework).toBe(true);
    expect(p.activeIndex).toBe(0);
    expect(p.activeIndex).not.toBe(p.steps.length - 1);
  });

  it('unknown referral status → safe default (node 0, no rework)', () => {
    const p = claimPipeline('referral', 'whatever');
    expect(p.activeIndex).toBe(0);
    expect(p.steps.length).toBe(3);
    expect(p.rework).toBeUndefined();
  });
});

describe('claimPipeline — reimbursement claims (3 real states → 3-node)', () => {
  it('renders exactly 3 nodes (never a fictional 5)', () => {
    expect(claimPipeline('claim', 'pending').steps).toEqual(['ยื่น', 'ตรวจ', 'อนุมัติ']);
    expect(claimPipeline('claim', 'pending').steps.length).toBe(3);
  });

  it('pending → node 1', () => {
    expect(claimPipeline('claim', 'pending').activeIndex).toBe(1);
  });

  it('info → node 1', () => {
    expect(claimPipeline('claim', 'info').activeIndex).toBe(1);
  });

  it('approved → node 2', () => {
    expect(claimPipeline('claim', 'approved').activeIndex).toBe(2);
  });

  it('claims never carry a rework flag', () => {
    expect(claimPipeline('claim', 'pending').rework).toBeUndefined();
    expect(claimPipeline('claim', 'approved').rework).toBeUndefined();
  });

  it('unknown claim status → safe default (node 0)', () => {
    const p = claimPipeline('claim', 'mystery');
    expect(p.activeIndex).toBe(0);
    expect(p.steps.length).toBe(3);
  });
});
