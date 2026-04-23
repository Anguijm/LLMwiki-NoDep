// Fixture for the DOM-injection-sink ESLint rule (no-restricted-syntax, M3 rev 4).
// Every statement below MUST produce an error when this file is linted.
// This file is excluded from the default `npm run lint` via eslint.config.js
// `ignores`; it is linted programmatically by tests/eslint-dom-sinks.test.js.
// If you are reading this and thinking about "cleaning up" the violations,
// don't — the violations ARE the test.

const el = document.createElement('div');

// Dotted-access assignments (6 of these in total, 2 per sink).
el.innerHTML = '<p>payload</p>';
el.outerHTML = '<p>payload</p>';

// Computed-access assignments — same sinks via string-key access.
el['innerHTML'] = '<p>payload</p>';
el['outerHTML'] = '<p>payload</p>';

// insertAdjacentHTML calls — dotted and computed.
el.insertAdjacentHTML('beforeend', '<p>payload</p>');
el['insertAdjacentHTML']('beforeend', '<p>payload</p>');
