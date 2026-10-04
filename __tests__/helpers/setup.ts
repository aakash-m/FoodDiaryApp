// Runs before every test file (jest "setupFiles").

// Pin a timezone with DST so date arithmetic is tested across clock changes regardless of the machine.
process.env.TZ = 'Europe/Berlin';

// expo-crypto is native; use Node's implementation in tests.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
