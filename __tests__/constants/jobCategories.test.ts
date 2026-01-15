/**
 * Unit Tests for Job Categories Enforcement
 * 
 * Tests that:
 * - JOB_CATEGORIES is the single source of truth
 * - No arbitrary category values can be introduced
 * - Category validation works correctly
 */

import { JOB_CATEGORIES, categoryLabelToSlug, categorySlugToLabel } from '@/src/constants/jobCategories';

describe('Job Categories Enforcement', () => {
  describe('JOB_CATEGORIES constant', () => {
    it('should contain the correct canonical categories', () => {
      const expectedCategories = [
        'Instruction',
        'Support',
        'Hospitality',
        'Events',
        'Management',
        'Operations',
        'Maintenance',
        'Marketing',
        'Creative',
        'Sales'
      ];

      expect(JOB_CATEGORIES).toEqual(expectedCategories);
    });

    it('should not contain old category values', () => {
      const oldCategories = [
        'Instructor / Coach',
        'Customer Support',
        'Repair / Maintenance',
        'Creative / Media',
        'Sales / Retail'
      ];

      oldCategories.forEach(oldCat => {
        expect(JOB_CATEGORIES).not.toContain(oldCat);
      });
    });

    it('should have unique values', () => {
      const uniqueCategories = new Set(JOB_CATEGORIES);
      expect(uniqueCategories.size).toBe(JOB_CATEGORIES.length);
    });
  });

  describe('Category validation', () => {
    it('should accept valid categories', () => {
      JOB_CATEGORIES.forEach(category => {
        expect(JOB_CATEGORIES.includes(category as any)).toBe(true);
      });
    });

    it('should reject invalid categories', () => {
      const invalidCategories = [
        'Instructor / Coach',
        'Customer Support',
        'Repair / Maintenance',
        'Creative / Media',
        'Sales / Retail',
        'Invalid Category',
        'Random String',
        '',
        null,
        undefined
      ].filter(Boolean);

      invalidCategories.forEach(category => {
        expect(JOB_CATEGORIES.includes(category as any)).toBe(false);
      });
    });

    it('should validate array of categories', () => {
      const validCategories = ['Instruction', 'Support', 'Hospitality'];
      const allValid = validCategories.every(cat => JOB_CATEGORIES.includes(cat as any));
      expect(allValid).toBe(true);

      const invalidCategories = ['Instruction', 'Invalid Category'];
      const allInvalid = invalidCategories.every(cat => JOB_CATEGORIES.includes(cat as any));
      expect(allInvalid).toBe(false);
    });
  });

  describe('Category slug conversion', () => {
    it('should convert labels to slugs correctly', () => {
      expect(categoryLabelToSlug('Instruction')).toBe('instruction');
      expect(categoryLabelToSlug('Support')).toBe('support');
      expect(categoryLabelToSlug('Management')).toBe('management');
    });

    it('should convert slugs to labels correctly', () => {
      expect(categorySlugToLabel('instruction')).toBe('Instruction');
      expect(categorySlugToLabel('support')).toBe('Support');
      expect(categorySlugToLabel('management')).toBe('Management');
    });

    it('should handle case-insensitive slug conversion', () => {
      expect(categorySlugToLabel('INSTRUCTION')).toBe('Instruction');
      expect(categorySlugToLabel('Instruction')).toBe('Instruction');
      expect(categorySlugToLabel('instruction')).toBe('Instruction');
    });

    it('should return null for invalid slugs', () => {
      expect(categorySlugToLabel('invalid-slug')).toBeNull();
      expect(categorySlugToLabel('')).toBeNull();
    });

    it('should be bidirectional (label -> slug -> label)', () => {
      JOB_CATEGORIES.forEach(label => {
        const slug = categoryLabelToSlug(label);
        const convertedLabel = categorySlugToLabel(slug);
        expect(convertedLabel).toBe(label);
      });
    });
  });
});





