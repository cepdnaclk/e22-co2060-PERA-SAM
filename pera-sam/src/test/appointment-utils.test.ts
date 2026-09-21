import { describe, it, expect } from 'vitest';
import {
  encodeAppointmentProposal,
  parseChatMessage,
  getScheduledInfo,
  AppointmentProposal,
} from '@/lib/appointment-utils';

describe('appointment-utils unit tests', () => {
  it('should encode and decode an appointment proposal properly', () => {
    const proposal: AppointmentProposal = {
      type: 'appointment_proposal',
      proposalId: 'prop-123',
      startDate: '2026-09-25',
      endDate: '2026-09-27',
      timeRange: '09:00 AM - 12:00 PM',
      note: 'Industrial fan repair',
      status: 'proposed',
    };

    const encoded = encodeAppointmentProposal(proposal, 'Hello, here is my preferred time window');
    expect(encoded).toContain('Hello, here is my preferred time window');
    expect(encoded).toContain('2026-09-25 to 2026-09-27');
    expect(encoded).toContain('09:00 AM - 12:00 PM');

    const parsed = parseChatMessage(encoded);
    expect(parsed.cleanText).toContain('Hello, here is my preferred time window');
    expect(parsed.proposal).toBeDefined();
    expect(parsed.proposal?.proposalId).toBe('prop-123');
    expect(parsed.proposal?.startDate).toBe('2026-09-25');
    expect(parsed.proposal?.endDate).toBe('2026-09-27');
    expect(parsed.proposal?.timeRange).toBe('09:00 AM - 12:00 PM');
    expect(parsed.proposal?.note).toBe('Industrial fan repair');
    expect(parsed.proposal?.status).toBe('proposed');
  });

  it('should parse attached images embedded or in attachment array', () => {
    const rawContent = 'Check this machine photo\n[[ATTACHMENT:https://example.com/photo1.jpg]]';
    const parsed = parseChatMessage(rawContent, ['https://example.com/photo2.jpg']);

    expect(parsed.cleanText).toBe('Check this machine photo');
    expect(parsed.attachments).toContain('https://example.com/photo1.jpg');
    expect(parsed.attachments).toContain('https://example.com/photo2.jpg');
  });

  it('should extract scheduled info from scheduled_date column', () => {
    const request = {
      scheduled_date: '2026-09-28T10:00:00Z',
      scheduled_time_slot: '10:00 AM - 01:00 PM',
      description: 'Issue with valve',
    };

    const info = getScheduledInfo(request);
    expect(info.isExplicit).toBe(true);
    expect(info.date).not.toBeNull();
    expect(info.date?.getUTCFullYear()).toBe(2026);
    expect(info.timeSlot).toBe('10:00 AM - 01:00 PM');
  });

  it('should fallback to parsing scheduled date from description if column is absent', () => {
    const request = {
      description: 'Issue: Pump motor overheated\nScheduled Date: 2026-10-05\nScheduled Time: 02:00 PM - 05:00 PM',
    };

    const info = getScheduledInfo(request);
    expect(info.isExplicit).toBe(true);
    expect(info.date).not.toBeNull();
    expect(info.date?.getFullYear()).toBe(2026);
    expect(info.timeSlot).toBe('02:00 PM - 05:00 PM');
  });

  it('should fallback to created_at when no scheduled date exists', () => {
    const request = {
      created_at: '2026-09-21T18:00:00Z',
      description: 'Regular request',
    };

    const info = getScheduledInfo(request);
    expect(info.isExplicit).toBe(false);
    expect(info.date).not.toBeNull();
    expect(info.timeSlot).toBeNull();
  });
});
