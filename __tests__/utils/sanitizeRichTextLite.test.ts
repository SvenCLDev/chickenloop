import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

describe('sanitizeRichTextLite', () => {
  it('unwraps paragraphs with class/style/id without leaking attributes as text', () => {
    const input =
      '<p class="p3">Hello</p><p class="p3" style="margin:0" id="x">World</p>';
    const result = sanitizeRichTextLite(input);

    expect(result).toBe('Hello<br />World');
    expect(result).not.toMatch(/class=/i);
    expect(result).not.toMatch(/style=/i);
    expect(result).not.toMatch(/id=/i);
    expect(result).not.toContain('p3');
  });

  it('unwraps a single attributed paragraph to plain text', () => {
    expect(sanitizeRichTextLite('<p class="p3">Hello</p>')).toBe('Hello');
  });

  it('keeps bold and lists while stripping attributes', () => {
    const input = '<p class="p3"><strong class="x">Bold</strong></p><ul class="list"><li id="1">Item</li></ul>';
    const result = sanitizeRichTextLite(input);

    expect(result).toContain('<b>Bold</b>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item</li>');
    expect(result).not.toMatch(/class=/i);
    expect(result).not.toMatch(/id=/i);
  });
});
