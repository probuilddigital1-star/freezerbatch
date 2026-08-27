import { describe, expect, it } from 'vitest';
import { getFreezeStatus, NEAR_LINE_MARGIN, SLUSHY_THRESHOLD } from './calculator';

/**
 * The three-value status enum is load-bearing (about ten readers, plus e2e
 * assertions on status-* class names), so "close to the line" is a qualifier
 * on 'safe', never a fourth status. These pin the band's edges.
 */
describe('getFreezeStatus', () => {
  it('freezes below 15', () => {
    expect(getFreezeStatus(14.9).status).toBe('freeze');
  });

  it('is slushy below the line, with nearLine false — the band only qualifies safe', () => {
    expect(getFreezeStatus(21.9)).toMatchObject({ status: 'slushy', nearLine: false });
  });

  it('is safe but near the line from exactly 22 up to just under 25', () => {
    expect(getFreezeStatus(22.0)).toMatchObject({ status: 'safe', nearLine: true });
    expect(getFreezeStatus(24.9)).toMatchObject({ status: 'safe', nearLine: true });
  });

  it('leaves the band at exactly the margin', () => {
    expect(getFreezeStatus(25.0)).toMatchObject({ status: 'safe', nearLine: false });
    expect(getFreezeStatus(40)).toMatchObject({ status: 'safe', nearLine: false });
  });

  it('band edges derive from the exported constants', () => {
    expect(getFreezeStatus(SLUSHY_THRESHOLD).nearLine).toBe(true);
    expect(getFreezeStatus(SLUSHY_THRESHOLD + NEAR_LINE_MARGIN).nearLine).toBe(false);
  });

  it('says so in the message for the near-line case', () => {
    expect(getFreezeStatus(22.7).message).toContain('clears the line, but only just');
    expect(getFreezeStatus(40).message).not.toContain('clears the line');
  });
});
