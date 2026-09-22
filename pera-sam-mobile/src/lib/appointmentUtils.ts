import { supabase } from './supabase';

export interface AppointmentProposal {
  type: 'appointment_proposal';
  proposalId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD
  timeRange: string; // e.g. "09:00 AM - 12:00 PM"
  note?: string;
  status: 'proposed' | 'accepted' | 'declined';
  confirmedDate?: string;
  confirmedTime?: string;
  confirmedBy?: string;
}

export interface ParsedChatMessage {
  cleanText: string;
  attachments: string[];
  proposal?: AppointmentProposal;
}

const PROPOSAL_TAG_START = '[[APPOINTMENT_PROPOSAL:';
const PROPOSAL_TAG_END = ':APPOINTMENT_PROPOSAL]]';

/**
 * Encode an appointment proposal into a message string with human-readable text
 */
export function encodeAppointmentProposal(proposal: AppointmentProposal, messageText?: string): string {
  const json = JSON.stringify(proposal);
  const userText = messageText?.trim() ? `${messageText.trim()}\n\n` : '';
  const rangeStr = proposal.endDate && proposal.endDate !== proposal.startDate 
    ? `${proposal.startDate} to ${proposal.endDate}` 
    : proposal.startDate;
  const humanReadable = `📅 [Appointment Request]: ${rangeStr} | Preferred Time: ${proposal.timeRange}${proposal.note ? ` (${proposal.note})` : ''}`;
  return `${userText}${humanReadable}\n${PROPOSAL_TAG_START}${json}${PROPOSAL_TAG_END}`;
}

/**
 * Parse a message content string into clean text, attachments, and proposal data
 */
export function parseChatMessage(content: string, rawAttachmentUrls?: string[] | null): ParsedChatMessage {
  let cleanText = content || '';
  let proposal: AppointmentProposal | undefined;
  const attachments: string[] = Array.isArray(rawAttachmentUrls) ? [...rawAttachmentUrls] : [];

  // Extract proposal if present
  if (cleanText.includes(PROPOSAL_TAG_START) && cleanText.includes(PROPOSAL_TAG_END)) {
    const startIdx = cleanText.indexOf(PROPOSAL_TAG_START);
    const endIdx = cleanText.indexOf(PROPOSAL_TAG_END, startIdx);
    if (startIdx !== -1 && endIdx !== -1) {
      const jsonStr = cleanText.substring(startIdx + PROPOSAL_TAG_START.length, endIdx);
      try {
        proposal = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse proposal JSON:', e);
      }
      cleanText = (cleanText.substring(0, startIdx) + cleanText.substring(endIdx + PROPOSAL_TAG_END.length)).trim();
    }
  }

  // Extract photos embedded in text like [[ATTACHMENT:url]]
  const imgRegex = /\[\[ATTACHMENT:([^\]]+)\]\]/g;
  let match;
  while ((match = imgRegex.exec(cleanText)) !== null) {
    if (match[1] && !attachments.includes(match[1])) {
      attachments.push(match[1]);
    }
  }
  cleanText = cleanText.replace(imgRegex, '').trim();

  return {
    cleanText,
    attachments,
    proposal,
  };
}

/**
 * Extract scheduled date and time slot from a repair request object
 */
export function getScheduledInfo(request: {
  scheduled_date?: string | null;
  scheduled_time_slot?: string | null;
  description?: string | null;
  created_at?: string;
}): { date: Date | null; timeSlot: string | null; isExplicit: boolean } {
  if (request.scheduled_date) {
    return {
      date: new Date(request.scheduled_date),
      timeSlot: request.scheduled_time_slot || null,
      isExplicit: true,
    };
  }

  // Fallback: parse from description
  if (request.description) {
    const dateMatch = request.description.match(/Scheduled Date:\s*([^\n\r]+)/i);
    const timeMatch = request.description.match(/Scheduled Time:\s*([^\n\r]+)/i);

    if (dateMatch && dateMatch[1]) {
      const parsedDate = new Date(dateMatch[1].trim());
      if (!isNaN(parsedDate.getTime())) {
        return {
          date: parsedDate,
          timeSlot: timeMatch ? timeMatch[1].trim() : null,
          isExplicit: true,
        };
      }
    }
  }

  // Final fallback to created_at
  return {
    date: request.created_at ? new Date(request.created_at) : null,
    timeSlot: null,
    isExplicit: false,
  };
}

/**
 * Persist an approved appointment date and time slot to repair_requests
 */
export async function saveApprovedAppointment(
  requestId: string,
  confirmedDate: string, // YYYY-MM-DD
  confirmedTimeSlot: string,
  currentDescription: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    const scheduledDateIso = new Date(`${confirmedDate}T12:00:00Z`).toISOString();

    // Try updating scheduled_date and scheduled_time_slot columns
    const { error: columnError } = await (supabase as any)
      .from('repair_requests')
      .update({
        status: 'accepted',
        scheduled_date: scheduledDateIso,
        scheduled_time_slot: confirmedTimeSlot,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (!columnError) {
      return { success: true };
    }

    console.warn('Could not update columns directly, falling back to description encoding:', columnError);

    // If column doesn't exist, update description with scheduled info
    const cleanDesc = currentDescription.replace(/Scheduled Date:[^\n\r]+/gi, '').replace(/Scheduled Time:[^\n\r]+/gi, '').trim();
    const updatedDesc = `${cleanDesc}\nScheduled Date: ${confirmedDate}\nScheduled Time: ${confirmedTimeSlot}`.trim();

    const { error: descError } = await (supabase as any)
      .from('repair_requests')
      .update({
        status: 'accepted',
        description: updatedDesc,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (descError) throw descError;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving approved appointment:', err);
    return { success: false, error: err.message || 'Failed to update appointment' };
  }
}
