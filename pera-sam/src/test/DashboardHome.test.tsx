import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardHome } from '../pages/dashboard/DashboardHome';
import { MemoryRouter } from 'react-router-dom';

// 1. Mock the Authentication Hook
// We pretend a user named "John Doe" is logged in.
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user-123', name: 'John Doe' },
  }),
}));

// 2. Mock the Supabase Client
// We prevent actual network requests and return fake database data instead.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'analysis-1',
                details: { filename: 'test_machine_audio.wav' },
                category: 'valve',
                status: 'normal',
                confidence: 95.5,
                created_at: '2023-10-01T12:00:00Z',
              },
            ],
            error: null,
          }),
        })),
      })),
    })),
  },
}));

describe('DashboardHome Integration Test', () => {
  beforeEach(() => {
    // Clear mocks before each test so they don't interfere with each other
    vi.clearAllMocks();
  });

  it('renders the welcome message with the authenticated user name', async () => {
    render(
      <MemoryRouter>
        <DashboardHome />
      </MemoryRouter>
    );

    // The component splits "John Doe" and only shows the first name
    // We use findByText which waits for asynchronous renders (like after useEffect loads data)
    expect(await screen.findByText('Welcome back, John!')).toBeInTheDocument();
  });

  it('renders the mocked analysis data in the recent analyses list', async () => {
    render(
      <MemoryRouter>
        <DashboardHome />
      </MemoryRouter>
    );

    // Check if our fake file name from the mocked database appears in the UI
    expect(await screen.findByText('test_machine_audio.wav')).toBeInTheDocument();

    // Check if the confidence score is formatted and rendered
    expect(await screen.findByText('95.5% conf.')).toBeInTheDocument();
  });

  it('displays correct action buttons and system status', async () => {
    render(
      <MemoryRouter>
        <DashboardHome />
      </MemoryRouter>
    );

    // Verify Quick Action buttons exist
    expect(screen.getByRole('button', { name: /Upload Audio File/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find Technicians/i })).toBeInTheDocument();

    // Verify system status indicator exists
    expect(screen.getByText('System Online')).toBeInTheDocument();
  });
});
