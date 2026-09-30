import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createConnection } from 'mysql2/promise';

// AI modified: initial administrator creation is an explicit one-time operator action, never an app startup side effect.
if (process.env.GNESTER_ALLOW_ADMIN_BOOTSTRAP !== 'true') {
  throw new Error(
    'Set GNESTER_ALLOW_ADMIN_BOOTSTRAP=true for this one-time operation.',
  );
}
const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
  ADMIN_EMAIL,
  ADMIN_NAME,
  ADMIN_PASSWORD,
} = process.env;
if (
  !DB_HOST ||
  !DB_PORT ||
  !DB_USERNAME ||
  !DB_PASSWORD ||
  !DB_DATABASE ||
  !ADMIN_EMAIL ||
  !ADMIN_NAME ||
  !ADMIN_PASSWORD
) {
  throw new Error(
    'DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD are required.',
  );
}
if (
  !Number.isSafeInteger(Number(DB_PORT)) ||
  Number(DB_PORT) < 1 ||
  Number(DB_PORT) > 65535
) {
  throw new Error('DB_PORT must be a valid TCP port.');
}
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL) ||
  ADMIN_NAME.trim().length === 0 ||
  ADMIN_NAME.length > 255 ||
  ADMIN_PASSWORD.length < 8 ||
  ADMIN_PASSWORD.length > 128
) {
  throw new Error('Admin email, name, or password is invalid.');
}
const connection = await createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
});
const lockName = 'gnester-lite:admin-bootstrap';
let hasBootstrapLock = false;
let hasTransactionStarted = false;
try {
  // AI modified: a connection-scoped lock prevents two bootstrap processes from both observing no administrator.
  const [locks] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [
    lockName,
  ]);
  if (locks[0]?.acquired !== 1)
    throw new Error('Could not acquire the administrator bootstrap lock.');
  hasBootstrapLock = true;
  await connection.beginTransaction();
  hasTransactionStarted = true;
  const [existingAdmins] = await connection.execute(
    "SELECT `id` FROM `user` WHERE FIND_IN_SET('admin', `role`) > 0 LIMIT 1 FOR UPDATE",
  );
  if (existingAdmins.length)
    throw new Error('An administrator already exists. Bootstrap refused.');
  const [existingAccount] = await connection.execute(
    'SELECT `id` FROM `user` WHERE `email` = ? LIMIT 1 FOR UPDATE',
    [ADMIN_EMAIL.trim().toLowerCase()],
  );
  if (existingAccount.length)
    throw new Error('Email already belongs to an account. Bootstrap refused.');
  const userId = randomUUID();
  // AI modified: operator-created accounts use the application password format.
  const salt = randomBytes(16).toString('base64url');
  const passwordKey = await promisify(scrypt)(ADMIN_PASSWORD, salt, 64);
  const passwordHash = `scrypt$${salt}$${passwordKey.toString('base64url')}`;
  await connection.execute(
    'INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `role`, `banned`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, false, ?, false, NOW(3), NOW(3))',
    [userId, ADMIN_NAME.trim(), ADMIN_EMAIL.trim().toLowerCase(), 'admin'],
  );
  await connection.execute(
    'INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `password`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))',
    [randomUUID(), userId, 'credential', userId, passwordHash],
  );
  await connection.commit();
  hasTransactionStarted = false;
  process.stdout.write(
    'Initial administrator created. Remove bootstrap variables from the environment.\n',
  );
} catch (error) {
  if (hasTransactionStarted) await connection.rollback();
  throw error;
} finally {
  try {
    if (hasBootstrapLock)
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
  } finally {
    await connection.end();
  }
}
