// cypress/e2e/faq-section.cypress.js
// Cypress test for FAQSection.astro accordion behavior

describe('FAQ Section Navigation and Accordion', () => {
  const mainUrl = '/';
  const springfieldSlug = 'springfield-lakes';
  const springfieldUrl = `/services/bond-cleaning/${springfieldSlug}/`;

  it('navigates to Springfield Lakes and interacts with FAQ', () => {
    cy.visit(mainUrl);

    // Click the Springfield Lakes link/button
    cy.contains('a', 'Springfield Lakes').click();

  // Wait for navigation
  cy.url().should('include', springfieldUrl);
  cy.contains('h1', 'Bond Cleaning in Springfield Lakes').should('exist');

  // Ensure FAQ section is present (current component markup)
  cy.contains('h2', 'Frequently Asked Questions').should('exist');
  cy.get('details.faq-polish').should('have.length.greaterThan', 0);

  // Expand the first FAQ item
  cy.get('details.faq-polish').first().as('firstFaq');
  cy.get('@firstFaq').should('not.have.attr', 'open');
  cy.get('@firstFaq').find('summary').click();
  cy.get('@firstFaq').should('have.attr', 'open');
  });
});
