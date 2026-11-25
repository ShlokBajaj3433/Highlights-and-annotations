import { extractDomain, getCanonicalUrl, normalizeUrl } from '@shared/url';
import { describe, expect, it } from 'vitest';

describe('URL utilities', () => {
  describe('extractDomain', () => {
    it('extracts domain from URL', () => {
      expect(extractDomain('https://www.example.com/path')).toBe('example.com');
      expect(extractDomain('https://sub.example.com/path')).toBe('sub.example.com');
      expect(extractDomain('http://localhost:3000')).toBe('localhost');
    });

    it('handles invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('');
    });
  });

  describe('normalizeUrl', () => {
    it('strips www prefix', () => {
      expect(normalizeUrl('https://www.example.com/path', 'example.com')).toBe('example.com/path');
    });

    it('strips tracking parameters', () => {
      const url = 'https://example.com/path?utm_source=google&utm_medium=cpc&ref=twitter';
      expect(normalizeUrl(url, 'example.com')).toBe('example.com/path?ref=twitter');
    });

    it('keeps allowlisted parameters and sorts them', () => {
      const url = 'https://youtube.com/watch?v=abc123&utm_source=google&list=PL123';
      // Search params are sorted alphabetically
      expect(normalizeUrl(url, 'youtube.com')).toBe('youtube.com/watch?list=PL123&v=abc123');
    });

    it('sorts search params', () => {
      const url = 'https://example.com/path?z=1&a=2';
      expect(normalizeUrl(url, 'example.com')).toBe('example.com/path?a=2&z=1');
    });

    it('removes hash fragment', () => {
      const url = 'https://example.com/path#section';
      expect(normalizeUrl(url, 'example.com')).toBe('example.com/path');
    });

    it('normalizes trailing slashes', () => {
      expect(normalizeUrl('https://example.com/path/', 'example.com')).toBe('example.com/path');
      expect(normalizeUrl('https://example.com/', 'example.com')).toBe('example.com/');
    });
  });

  describe('getCanonicalUrl', () => {
    it('extracts canonical URL from document', () => {
      const doc = document.implementation.createHTMLDocument();
      const link = doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', 'https://canonical.example.com/page');
      doc.head.appendChild(link);

      expect(getCanonicalUrl(doc)).toBe('https://canonical.example.com/page');
    });

    it('returns null when no canonical', () => {
      const doc = document.implementation.createHTMLDocument();
      expect(getCanonicalUrl(doc)).toBeNull();
    });
  });
});
