import { describe, it, expect } from 'vitest';
import { hasRole, hasAnyRole, canAccessModule, isManager, isHR, getHighestRole } from '../rbac';
import type { Role } from '../rbac';

describe('RBAC', () => {
 describe('hasRole', () => {
 it('returns true for exact role match', () => {
 expect(hasRole(['employee'],'employee')).toBe(true);
 });

 it('returns true for inherited role', () => {
 expect(hasRole(['hr_manager'],'employee')).toBe(true);
 expect(hasRole(['hr_manager'],'manager')).toBe(true);
 expect(hasRole(['hr_manager'],'hr_admin')).toBe(true);
 });

 it('returns false for higher role', () => {
 expect(hasRole(['employee'],'manager')).toBe(false);
 expect(hasRole(['manager'],'hr_admin')).toBe(false);
 });
 });

 describe('hasAnyRole', () => {
 it('returns true if user has any of the required roles', () => {
 expect(hasAnyRole(['manager'], ['employee','manager'])).toBe(true);
 });

 it('returns false if user has none of the required roles', () => {
 expect(hasAnyRole(['employee'], ['hr_admin','hr_manager'])).toBe(false);
 });
 });

 describe('canAccessModule', () => {
 it('allows employee to access profile', () => {
 expect(canAccessModule(['employee'],'profile')).toBe(true);
 });

 it('denies employee access to payroll-setup', () => {
 expect(canAccessModule(['employee'],'payroll-setup')).toBe(false);
 });

 it('allows hr_admin to access payroll-setup', () => {
 expect(canAccessModule(['hr_admin'],'payroll-setup')).toBe(true);
 });

 it('returns false for unknown module', () => {
 expect(canAccessModule(['hr_manager'],'nonexistent')).toBe(false);
 });
 });

 describe('isManager / isHR', () => {
 it('identifies managers', () => {
 expect(isManager(['manager'])).toBe(true);
 expect(isManager(['hr_admin'])).toBe(true);
 expect(isManager(['employee'])).toBe(false);
 });

 it('identifies HR', () => {
 expect(isHR(['hr_admin'])).toBe(true);
 expect(isHR(['hr_manager'])).toBe(true);
 expect(isHR(['manager'])).toBe(false);
 });
 });

 describe('getHighestRole', () => {
 it('returns highest role from list', () => {
 expect(getHighestRole(['employee','manager'])).toBe('manager');
 expect(getHighestRole(['hr_admin','employee'])).toBe('hr_admin');
 });

 it('defaults to employee for empty list', () => {
 expect(getHighestRole([])).toBe('employee');
 });

 it('resolves spd as its own highest role', () => {
 expect(getHighestRole(['spd'])).toBe('spd');
 expect(getHighestRole(['spd','employee'])).toBe('spd');
 });

 it('resolves hrbp as its own highest role', () => {
 expect(getHighestRole(['hrbp'])).toBe('hrbp');
 expect(getHighestRole(['hrbp','employee'])).toBe('hrbp');
 });

 it('ranks hr_admin above spd and hrbp', () => {
 expect(getHighestRole(['spd','hr_admin'])).toBe('hr_admin');
 expect(getHighestRole(['hrbp','hr_admin'])).toBe('hr_admin');
 });

 it('ranks spd above hrbp in priority', () => {
 // hierarchy comment: hr_manager > hr_admin > spd > hrbp > manager > employee
 expect(getHighestRole(['spd','hrbp'])).toBe('spd');
 expect(getHighestRole(['hrbp','spd'])).toBe('spd');
 });
 });

 describe('MODULE_ACCESS — spd/hrbp gaps', () => {
 it('spd can access quick-approve', () => {
 expect(canAccessModule(['spd'],'quick-approve')).toBe(true);
 });

 it('hrbp can access quick-approve', () => {
 expect(canAccessModule(['hrbp'],'quick-approve')).toBe(true);
 });

 it('spd can access spd-management (eponymous-role gap fixed)', () => {
 expect(canAccessModule(['spd'],'spd-management')).toBe(true);
 });

 it('hrbp can access hrbp-reports', () => {
 expect(canAccessModule(['hrbp'],'hrbp-reports')).toBe(true);
 });

 it('employee cannot access quick-approve', () => {
 expect(canAccessModule(['employee'],'quick-approve')).toBe(false);
 });

 it('employee cannot access spd-management', () => {
 expect(canAccessModule(['employee'],'spd-management')).toBe(false);
 });

 it('spd can access payroll-tax-review', () => {
 expect(canAccessModule(['spd'],'payroll-tax-review')).toBe(true);
 });

 it('hr_admin can access payroll-tax-review', () => {
 expect(canAccessModule(['hr_admin'],'payroll-tax-review')).toBe(true);
 });

 it('manager cannot access payroll-tax-review', () => {
 expect(canAccessModule(['manager'],'payroll-tax-review')).toBe(false);
 });

 it('employee cannot access payroll-tax-review', () => {
 expect(canAccessModule(['employee'],'payroll-tax-review')).toBe(false);
 });
 });
});
