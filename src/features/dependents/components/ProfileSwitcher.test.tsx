import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { ProfileSwitcher } from './ProfileSwitcher';
import { useProfileStore } from '../../../store/profile-store';

describe('ProfileSwitcher', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profiles: [],
      selectedProfileId: null,
    });
  });

  it('renders nothing with one or zero profiles', () => {
    useProfileStore.setState({
      profiles: [{ id: 'p-1', fullName: 'Self', isSelf: true }],
      selectedProfileId: 'p-1',
    });

    const { container } = render(<ProfileSwitcher />);
    expect(container.innerHTML).toBe('');
  });

  it('renders switcher with multiple profiles', () => {
    useProfileStore.setState({
      profiles: [
        { id: 'p-1', fullName: 'Self', isSelf: true },
        { id: 'p-2', fullName: 'Child One', isSelf: false },
      ],
      selectedProfileId: 'p-1',
    });

    render(<ProfileSwitcher />);

    expect(screen.getByLabelText(/acting for/i)).toBeInTheDocument();
    expect(screen.getByText(/Self \(you\)/)).toBeInTheDocument();
    expect(screen.getByText('Child One')).toBeInTheDocument();
  });

  it('uses selected profile ID as select value', () => {
    useProfileStore.setState({
      profiles: [
        { id: 'p-1', fullName: 'Self', isSelf: true },
        { id: 'p-2', fullName: 'Child One', isSelf: false },
      ],
      selectedProfileId: 'p-2',
    });

    render(<ProfileSwitcher />);

    expect((screen.getByLabelText(/acting for/i) as HTMLSelectElement).value).toBe('p-2');
  });
});
