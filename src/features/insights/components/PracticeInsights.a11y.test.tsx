import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from '../../../test/render';
import { UtilisationChart } from './UtilisationChart';
import { DateRangeSelector } from './DateRangeSelector';
import { DEFAULT_MOCK_INSIGHTS } from './PracticeInsightsView';

const utilisation = DEFAULT_MOCK_INSIGHTS.utilisation;

describe('Practice insights accessibility (#90)', () => {
  it('chart view has no axe violations and a named image', async () => {
    const { container } = render(
      <UtilisationChart
        weeks={utilisation.weeks}
        overallOfferedSlots={utilisation.overallOfferedSlots}
        overallBookedSlots={utilisation.overallBookedSlots}
        overallUtilisationRate={utilisation.overallUtilisationRate}
        sampleSizeWarning={utilisation.sampleSizeWarning}
      />,
    );

    expect(screen.getByRole('img', { name: /weekly offered vs booked slots/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('table view exposes captions and scoped headers', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <UtilisationChart
        weeks={utilisation.weeks}
        overallOfferedSlots={utilisation.overallOfferedSlots}
        overallBookedSlots={utilisation.overallBookedSlots}
        overallUtilisationRate={utilisation.overallUtilisationRate}
        sampleSizeWarning={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /table view/i }));

    expect(
      screen.getByRole('table', { name: /weekly slot utilisation data table/i }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('date range selector is a labelled fieldset with no duplicate labels', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateRangeSelector currentPreset="custom" onChangePreset={onChange} />,
    );

    expect(screen.getByRole('group', { name: /custom date range/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
