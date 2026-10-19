import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { PracticeInsightsView, DEFAULT_MOCK_INSIGHTS } from './PracticeInsightsView';
import { UtilisationChart } from './UtilisationChart';
import { NoShowMetricsCard } from './NoShowMetricsCard';
import { TurnaroundMetricsCard } from './TurnaroundMetricsCard';
import { DateRangeSelector } from './DateRangeSelector';
import { useAuthStore } from '../../../store/auth-store';
import * as insightsService from '../../../services/insights-service';
import type { DoctorPracticeInsights } from '../../../types/models';

vi.mock('../../../services/insights-service');

const MOCK_LOW_SAMPLE_INSIGHTS: DoctorPracticeInsights = {
  ...DEFAULT_MOCK_INSIGHTS,
  utilisation: {
    weeks: [
      {
        weekLabel: 'Oct 12',
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        offeredSlots: 4,
        bookedSlots: 2,
        completedSlots: 2,
        utilisationRate: 50.0,
      },
    ],
    overallOfferedSlots: 4,
    overallBookedSlots: 2,
    overallUtilisationRate: 50.0,
    sampleSizeWarning: true,
  },
  noShows: {
    totalScheduled: 3,
    completedVisits: 2,
    noShows: 1,
    lateCancellations: 0,
    onTimeCancellations: 0,
    noShowRate: 33.3,
    lateCancelRate: 0.0,
    sampleSizeWarning: true,
  },
  referrals: {
    totalSent: 2,
    totalAccepted: 1,
    totalPending: 1,
    averageAcceptanceHours: 12.0,
    medianAcceptanceHours: 12.0,
    breakdownUnder24h: 1,
    breakdown24to48h: 0,
    breakdownOver48h: 0,
    sampleSizeWarning: true,
  },
  messages: {
    totalThreads: 3,
    averageFirstResponseMinutes: 15,
    medianFirstResponseMinutes: 12,
    respondedWithin2hCount: 3,
    respondedWithin24hCount: 3,
    rateWithin2h: 100.0,
    sampleSizeWarning: true,
  },
};

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'test-token',
    user: { id: 'doc-1', email: 'doctor@docforum.org', role: 'doctor', createdAt: '', updatedAt: '' },
  });
  vi.mocked(insightsService.getDoctorPracticeInsights).mockResolvedValue(DEFAULT_MOCK_INSIGHTS);
});

describe('Doctor Practice Insights (#50)', () => {
  it('renders privacy guarantee ensuring strictly doctor own data and no peer comparisons', async () => {
    render(<PracticeInsightsView />);

    await screen.findByRole('heading', { name: /practice insights/i });
    expect(
      screen.getByText(/This view is strictly private to your account. No comparisons are made with named peer doctors./i),
    ).toBeInTheDocument();
  });

  describe('UtilisationChart', () => {
    it('renders weekly utilisation with both chart view and accessible table alternative', async () => {
      render(
        <UtilisationChart
          weeks={DEFAULT_MOCK_INSIGHTS.utilisation.weeks}
          overallOfferedSlots={125}
          overallBookedSlots={108}
          overallUtilisationRate={86.4}
          sampleSizeWarning={false}
        />,
      );

      // Verify stats summary
      expect(screen.getByText('125')).toBeInTheDocument();
      expect(screen.getByText('108')).toBeInTheDocument();
      expect(screen.getByText('86.4%')).toBeInTheDocument();

      // Check chart exists
      expect(screen.getByRole('img', { name: /Bar chart showing weekly offered vs booked slots/i })).toBeInTheDocument();

      // Switch to table view
      const tableButton = screen.getByRole('button', { name: /table view/i });
      await userEvent.click(tableButton);

      // Verify table alternative has appropriate headers and contents
      const table = screen.getByRole('table', { name: /weekly slot utilisation/i });
      expect(table).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Offered/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Booked/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Utilisation/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: 'Sep 21' })).toBeInTheDocument();
    });

    it('shows small-sample caveat when slot count is low', () => {
      render(
        <UtilisationChart
          weeks={MOCK_LOW_SAMPLE_INSIGHTS.utilisation.weeks}
          overallOfferedSlots={4}
          overallBookedSlots={2}
          overallUtilisationRate={50.0}
          sampleSizeWarning={true}
        />,
      );

      expect(screen.getByText(/Only 4 slots offered in this period/i)).toBeInTheDocument();
      expect(screen.getByText(/Small sample caveat/i)).toBeInTheDocument();
    });
  });

  describe('NoShowMetricsCard', () => {
    it('renders no-show rates and accessible table alternative', async () => {
      render(<NoShowMetricsCard metrics={DEFAULT_MOCK_INSIGHTS.noShows} />);

      expect(screen.getAllByText('4.6%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('2.8%').length).toBeGreaterThanOrEqual(1);

      // Switch to table view
      const tableButton = screen.getByRole('button', { name: /table view/i });
      await userEvent.click(tableButton);

      const table = screen.getByRole('table', { name: /Appointment attendance and cancellation metrics table/i });
      expect(table).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /No-Shows/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /Late Cancellations/i })).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /Completed Visits/i })).toBeInTheDocument();
    });

    it('displays small-sample caveat for low appointment volume', () => {
      render(<NoShowMetricsCard metrics={MOCK_LOW_SAMPLE_INSIGHTS.noShows} />);

      expect(screen.getByText(/Only 3 total scheduled visits in this period/i)).toBeInTheDocument();
    });
  });

  describe('TurnaroundMetricsCard', () => {
    it('renders referral and message turnaround with accessible table alternatives', async () => {
      render(
        <TurnaroundMetricsCard
          referrals={DEFAULT_MOCK_INSIGHTS.referrals}
          messages={DEFAULT_MOCK_INSIGHTS.messages}
        />,
      );

      expect(screen.getByText(/Referral acceptance turnaround/i)).toBeInTheDocument();
      expect(screen.getByText(/Messages response time/i)).toBeInTheDocument();
      expect(screen.getByText('14.0h')).toBeInTheDocument();
      expect(screen.getByText('24m')).toBeInTheDocument();

      // Switch both sections to table view
      const tableButtons = screen.getAllByRole('button', { name: /table view/i });
      for (const btn of tableButtons) {
        await userEvent.click(btn);
      }

      const refTable = screen.getByRole('table', { name: /Referral turnaround breakdown table/i });
      expect(refTable).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /Under 24 hours/i })).toBeInTheDocument();

      const msgTable = screen.getByRole('table', { name: /Patient message response time table/i });
      expect(msgTable).toBeInTheDocument();
      expect(screen.getByRole('rowheader', { name: /Within 2 hours/i })).toBeInTheDocument();
    });

    it('displays small-sample caveats on turnaround when sample is low', () => {
      render(
        <TurnaroundMetricsCard
          referrals={MOCK_LOW_SAMPLE_INSIGHTS.referrals}
          messages={MOCK_LOW_SAMPLE_INSIGHTS.messages}
        />,
      );

      expect(screen.getByText(/Only 2 referrals issued in this period/i)).toBeInTheDocument();
      expect(screen.getByText(/Only 3 message threads in this period/i)).toBeInTheDocument();
    });
  });

  describe('DateRangeSelector', () => {
    it('allows changing presets and applying custom range', async () => {
      const onChange = vi.fn();
      render(<DateRangeSelector currentPreset="30d" onChangePreset={onChange} />);

      const sevenDays = screen.getByRole('button', { name: /Last 7 days/i });
      await userEvent.click(sevenDays);
      expect(onChange).toHaveBeenCalledWith('7d');

      const customBtn = screen.getByRole('button', { name: /Custom range/i });
      await userEvent.click(customBtn);
      expect(onChange).toHaveBeenCalledWith('custom');
    });
  });
});
