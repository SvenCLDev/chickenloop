import { sanitizeJobDescription } from '@/lib/sanitizeJobDescription';

describe('sanitizeJobDescription', () => {
  it('strips full document HTML (html, head, body, h1) and keeps only allowed tags', () => {
    const input = `<html> <head> <title>Page Title</title> </head> <body> <h1>My First Heading</h1> <p>My first paragraph.</p> </body> </html>`;
    const result = sanitizeJobDescription(input);

    // Should not contain disallowed tags
    expect(result).not.toMatch(/<html/i);
    expect(result).not.toMatch(/<head/i);
    expect(result).not.toMatch(/<title/i);
    expect(result).not.toMatch(/<body/i);
    expect(result).not.toMatch(/<h1/i);

    // Should contain the text content
    expect(result).toContain('Page Title');
    expect(result).toContain('My First Heading');
    expect(result).toContain('My first paragraph.');
  });

  it('allows only p, br, strong, b, ul, ol, li, u, em', () => {
    const input = '<div><span style="color:red">Hello</span></div><p>World</p>';
    const result = sanitizeJobDescription(input);

    expect(result).not.toMatch(/<div/i);
    expect(result).not.toMatch(/<span/i);
    expect(result).not.toMatch(/style=/);
    expect(result).toContain('Hello');
    expect(result).toContain('<p>');
    expect(result).toContain('World');
  });

  it('decodes HTML entities before sanitizing so entity-encoded tags are stripped', () => {
    const input = '&lt;html&gt;\n&lt;head&gt;\n&lt;title&gt;Page Title&lt;/title&gt;\n&lt;/head&gt;\n&lt;body&gt;\n&lt;h1&gt;My First Heading&lt;/h1&gt;\n&lt;p&gt;My first paragraph.&lt;/p&gt;\n&lt;/body&gt;\n&lt;/html&gt;';
    const result = sanitizeJobDescription(input);

    expect(result).not.toMatch(/<html/i);
    expect(result).not.toMatch(/<head/i);
    expect(result).not.toMatch(/<h1/i);
    expect(result).not.toMatch(/&lt;/);
    expect(result).not.toMatch(/&gt;/);
    expect(result).toContain('Page Title');
    expect(result).toContain('My First Heading');
    expect(result).toContain('My first paragraph.');
  });
});
