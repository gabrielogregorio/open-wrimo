import { render } from '@testing-library/react';
import { RichText } from './rich-text';

describe('RichText', () => {
  it('keeps plain text in a paragraph that preserves line breaks', () => {
    const { container } = render(<RichText html={'First line\nSecond line'} className="lead" />);
    const paragraph = container.querySelector('p');

    expect(paragraph).toHaveTextContent('First line Second line');
    expect(paragraph).toHaveClass('whitespace-pre-line', 'lead');
  });

  it('renders sanitized HTML and drops unsafe tags', () => {
    const { container } = render(<RichText html="<p>Hello <strong>world</strong></p><script>alert(1)</script>" />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass('rich-text');
    expect(wrapper?.querySelector('strong')).toHaveTextContent('world');
    expect(wrapper?.querySelector('script')).toBeNull();
  });
});
