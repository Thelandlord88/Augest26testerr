import { describe, it, expect } from 'vitest';
import { toServiceCards } from '~/lib/serviceNav.adapter';

describe('serviceNav.adapter', () => {
  it('maps nearby and here correctly', () => {
    const items: any = [
      { label: 'Spring Cleaning', href: '/services/spring-cleaning/ipswich/', here: true, data: { service: 'spring-cleaning', suburb: 'ipswich' } },
      { label: 'Bathroom Deep Clean (nearby)', href: '/services/bathroom-deep-clean/goodna/', here: false, data: { service: 'bathroom-deep-clean', suburb: 'goodna', source: 'nearby' } }
    ];
    const cards = toServiceCards(items, { currentSuburb: 'ipswich' });
    expect(cards[0].attrs['data-nearby']).toBe('false');
    expect(cards[1].attrs['data-nearby']).toBe('true');
    expect(cards[0].desc).toMatch(/Available in Ipswich/i);
    expect(cards[1].desc).toMatch(/Available nearby in Goodna/i);
  });
});
