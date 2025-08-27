import faqTemplates from './faqTemplates.js';
import faqOverrides from './faqOverrides.js';
import suburbFacts from './suburbFacts.js';

/**
 * Generates a FAQ array for the given suburb.
 * - Replaces {{suburb}} with the actual suburb name in Q/A.
 * - Replaces {{fact}} with the unique fact from suburbFacts.js.
 * - Merges in any FAQ overrides for the suburb.
 *
 * @param {string} suburbName - The suburb to generate FAQs for.
 * @returns {Array<{question: string, answer: string}>}
 */
export default function getSuburbFaq(suburbName) {
  const fact = suburbFacts[suburbName]?.answer || "";
  const overrides = faqOverrides[suburbName] || [];
  const overrideQs = new Set(overrides.map(q => q.question.replace('{{suburb}}', suburbName)));

  const templated = faqTemplates
    .filter(t => !overrideQs.has(t.question.replace('{{suburb}}', suburbName)))
    .map(t => ({
      question: t.question.replace(/{{suburb}}/g, suburbName),
      answer: t.answer
        .replace(/{{suburb}}/g, suburbName)
        .replace(/{{fact}}/g, fact)
    }));

  return [...overrides, ...templated];
}
