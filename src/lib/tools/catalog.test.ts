import { TOOLS, orderByFavorites, readFavorites, toggleFavorite, toolById } from './catalog';

describe('tool catalog', () => {
  it('gives every tool a unique id', () => {
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(TOOLS.length);
    expect(toolById('focus')?.category).toBe('write');
    expect(toolById('nope')).toBeUndefined();
  });

  it('puts favorites first in the order they were picked', () => {
    const order = orderByFavorites(TOOLS, ['heatmap', 'focus']).map((tool) => tool.id);

    expect(order.slice(0, 3)).toEqual(['heatmap', 'focus', 'counter']);
    expect(order).toHaveLength(TOOLS.length);
  });

  it('adds and removes a favorite', () => {
    expect(toggleFavorite(['focus'], 'heatmap')).toEqual(['focus', 'heatmap']);
    expect(toggleFavorite(['focus', 'heatmap'], 'focus')).toEqual(['heatmap']);
  });

  it('reads stored favorites and drops anything that is not a known tool', () => {
    expect(readFavorites('["focus", 3, "gone", "epub"]')).toEqual(['focus', 'epub']);
    expect(readFavorites('{"focus": true}')).toEqual([]);
    expect(readFavorites('not json')).toEqual([]);
    expect(readFavorites(null)).toEqual([]);
  });
});
