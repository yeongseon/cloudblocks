import { describe, expect, it } from 'vitest';
import { awsSubtypeRegistry } from '../aws/subtypes';
import { gcpSubtypeRegistry } from '../gcp/subtypes';
import { azureSubtypeRegistry } from '../azure/subtypes';

const registries = [
  { name: 'AWS', registry: awsSubtypeRegistry },
  { name: 'GCP', registry: gcpSubtypeRegistry },
  { name: 'Azure', registry: azureSubtypeRegistry },
] as const;

const requiredCategories = ['compute', 'database', 'storage', 'gateway'] as const;
const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

describe('subtype registries', () => {
  for (const { name, registry } of registries) {
    describe(name, () => {
      it('is a non-empty object', () => {
        expect(Object.keys(registry).length).toBeGreaterThan(0);
      });

      for (const category of requiredCategories) {
        it(`has ${category} category`, () => {
          expect(registry[category]).toBeDefined();
          expect(Object.keys(registry[category] ?? {}).length).toBeGreaterThan(0);
        });
      }

      it('has valid entries with displayName and description', () => {
        for (const [, subtypes] of Object.entries(registry)) {
          for (const [key, entry] of Object.entries(subtypes ?? {})) {
            expect(key).toMatch(kebabCaseRegex);
            expect(typeof entry.displayName).toBe('string');
            expect(entry.displayName.trim().length).toBeGreaterThan(0);
            expect(typeof entry.description).toBe('string');
            expect(entry.description.trim().length).toBeGreaterThan(0);

            if (entry.defaultConfig !== undefined) {
              expect(entry.defaultConfig).toBeTypeOf('object');
              expect(entry.defaultConfig).not.toBeNull();
            }
          }
        }
      });
    });
  }
});
