import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { TIME_ZONE_COOKIE } from '@/lib/writing/dates';
import { TimeZoneSync } from './time-zone-sync';

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

const refresh = vi.fn();

const stubZone = (timeZone: string): void => {
  vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
    resolvedOptions: () => ({ timeZone }),
  } as Intl.DateTimeFormat);
};

describe('TimeZoneSync', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ refresh } as unknown as ReturnType<typeof useRouter>);
    document.cookie = `${TIME_ZONE_COOKIE}=; max-age=0; path=/`;
  });

  it('saves the browser time zone and refreshes when it differs from the saved one', () => {
    stubZone('America/Sao_Paulo');

    const { container } = render(<TimeZoneSync saved="UTC" />);

    expect(container).toBeEmptyDOMElement();
    expect(document.cookie).toContain(`${TIME_ZONE_COOKIE}=America%2FSao_Paulo`);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the zone is already saved', () => {
    stubZone('Europe/Lisbon');

    render(<TimeZoneSync saved="Europe/Lisbon" />);

    expect(refresh).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain(TIME_ZONE_COOKIE);
  });

  it('does nothing when the browser reports no zone', () => {
    stubZone('');

    render(<TimeZoneSync saved={undefined} />);

    expect(refresh).not.toHaveBeenCalled();
  });
});
