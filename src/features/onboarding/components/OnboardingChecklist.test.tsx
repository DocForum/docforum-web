import { describe, expect, it } from 'vitest';
import { render, screen, within } from '../../../test/render';
import { OnboardingChecklist } from './OnboardingChecklist';
import { patientOnboardingSteps } from '../steps';

describe('OnboardingChecklist', () => {
  it('shows progress from the given steps, not from anything it stored', () => {
    const steps = patientOnboardingSteps({
      profileComplete: true,
      healthProfileComplete: true,
      firstSearchComplete: false,
    });

    render(<OnboardingChecklist title="Get set up" intro="Three quick steps." steps={steps} />);

    expect(screen.getByRole('heading', { name: 'Get set up' })).toBeInTheDocument();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Get set up' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuetext', '2 of 3 steps complete');
  });

  it('marks each step done or to do in text, and only links the remaining work', () => {
    const steps = patientOnboardingSteps({
      profileComplete: true,
      healthProfileComplete: false,
      firstSearchComplete: false,
    });

    render(<OnboardingChecklist title="Get set up" intro="Three quick steps." steps={steps} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Done')).toBeInTheDocument();
    expect(within(items[0]).queryByRole('link')).not.toBeInTheDocument();
    expect(within(items[1]).getByText('To do')).toBeInTheDocument();
    expect(within(items[1]).getByRole('link', { name: 'Start: Fill in your health profile' })).toHaveAttribute(
      'href',
      '/patient/health',
    );
    expect(within(items[2]).getByRole('link', { name: 'Start: Find a pharmacy or lab' })).toHaveAttribute(
      'href',
      '/patient/facilities',
    );
  });

  it('renders nothing once every step is complete', () => {
    const steps = patientOnboardingSteps({
      profileComplete: true,
      healthProfileComplete: true,
      firstSearchComplete: true,
    });

    const { container } = render(
      <OnboardingChecklist title="Get set up" intro="Three quick steps." steps={steps} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty step list', () => {
    const { container } = render(<OnboardingChecklist title="Get set up" intro="" steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
