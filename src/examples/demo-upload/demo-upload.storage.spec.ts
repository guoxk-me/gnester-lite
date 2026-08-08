import {
  access,
  mkdir,
  readdir,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEMO_UPLOAD_ORPHAN_RETENTION_MS } from './demo-upload.constants';
import { DemoUploadChunkStorage } from './demo-upload.storage';

describe('DemoUploadChunkStorage', () => {
  const storageBase = join(
    tmpdir(),
    `gnester-lite-upload-storage-${process.pid}`,
  );
  const symlinkTarget = `${storageBase}-symlink-target`;

  afterEach(async () => {
    await rm(storageBase, { force: true, recursive: true });
    await rm(symlinkTarget, { force: true, recursive: true });
  });

  it('removes stale process artifacts while preserving a live parallel instance', async () => {
    const now = Date.parse('2026-07-28T00:00:00.000Z');
    const liveStorage = new DemoUploadChunkStorage(storageBase);
    await liveStorage.initialize(now);
    const [liveInstanceDirectory] = await readdir(storageBase);
    const staleInstanceDirectory = join(storageBase, 'stale-instance');
    const staleLeasePath = join(staleInstanceDirectory, '.instance-lease');
    const staleTime = new Date(now - DEMO_UPLOAD_ORPHAN_RETENTION_MS - 1);
    await mkdir(staleInstanceDirectory, { recursive: true });
    await writeFile(staleLeasePath, '');
    await utimes(staleLeasePath, staleTime, staleTime);

    const currentStorage = new DemoUploadChunkStorage(storageBase);
    await currentStorage.initialize(now);

    await expect(access(staleInstanceDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(
      access(join(storageBase, liveInstanceDirectory)),
    ).resolves.toBeUndefined();

    await currentStorage.clearAll();
    await expect(
      access(join(storageBase, liveInstanceDirectory)),
    ).resolves.toBeUndefined();
    await liveStorage.clearAll();
  });

  it('keeps a recent orphan at startup and removes it after retention elapses', async () => {
    const now = Date.parse('2026-07-28T00:00:00.000Z');
    const recentOrphanDirectory = join(storageBase, 'recent-orphan');
    const recentLeasePath = join(recentOrphanDirectory, '.instance-lease');
    await mkdir(recentOrphanDirectory, { recursive: true });
    await writeFile(recentLeasePath, '');
    const recentLeaseTime = new Date(now);
    await utimes(recentLeasePath, recentLeaseTime, recentLeaseTime);
    const currentStorage = new DemoUploadChunkStorage(storageBase);

    await currentStorage.initialize(now);
    await expect(access(recentOrphanDirectory)).resolves.toBeUndefined();

    await currentStorage.clearOrphanedInstances(
      now + DEMO_UPLOAD_ORPHAN_RETENTION_MS + 1,
    );
    await expect(access(recentOrphanDirectory)).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await currentStorage.clearAll();
  });

  it('ignores a peer entry that disappears between directory scan and stat', async () => {
    const vanishedPeerPath = join(storageBase, 'vanished-peer');
    await mkdir(storageBase, { recursive: true });
    await symlink(join(storageBase, 'already-removed'), vanishedPeerPath);
    const currentStorage = new DemoUploadChunkStorage(storageBase);

    await expect(currentStorage.initialize()).resolves.toBeUndefined();

    await currentStorage.clearAll();
  });

  it('rejects a pre-existing base symlink without touching its target', async () => {
    const protectedFile = join(symlinkTarget, 'must-remain.txt');
    await mkdir(symlinkTarget, { mode: 0o755 });
    await writeFile(protectedFile, 'outside upload storage');
    await symlink(symlinkTarget, storageBase);
    const storage = new DemoUploadChunkStorage(storageBase);

    await expect(storage.initialize()).rejects.toThrow(
      'must be a directory owned by the current process user',
    );
    await expect(access(protectedFile)).resolves.toBeUndefined();
    await expectPermissionMode(symlinkTarget, 0o755);
  });

  it('keeps temporary upload directories and files private regardless of umask', async () => {
    const previousUmask = process.umask(0);
    const uploadId = '018f00a0-0000-7000-8000-000000000001';
    const storage = new DemoUploadChunkStorage(storageBase);

    try {
      await storage.initialize();
      const [instanceDirectoryName] = await readdir(storageBase);
      const instanceDirectory = join(storageBase, instanceDirectoryName);
      const uploadDirectory = join(instanceDirectory, uploadId);
      const leasePath = join(instanceDirectory, '.instance-lease');
      const chunkPath = join(uploadDirectory, '000000.chunk');
      const stagedPath = join(instanceDirectory, `${uploadId}.assembling`);
      const completedPath = join(instanceDirectory, `${uploadId}.complete`);

      await storage.saveChunk(uploadId, 0, Buffer.from('private upload'));
      await storage.assembleUpload(uploadId, 1);

      await expectPermissionMode(storageBase, 0o700);
      await expectPermissionMode(instanceDirectory, 0o700);
      await expectPermissionMode(uploadDirectory, 0o700);
      await expectPermissionMode(leasePath, 0o600);
      await expectPermissionMode(chunkPath, 0o600);
      await expectPermissionMode(stagedPath, 0o600);

      await storage.publishUpload(uploadId);
      await expectPermissionMode(completedPath, 0o600);
    } finally {
      process.umask(previousUmask);
      await storage.clearAll();
    }
  });
});

async function expectPermissionMode(
  path: string,
  expectedMode: number,
): Promise<void> {
  const pathStats = await stat(path);

  expect(pathStats.mode & 0o777).toBe(expectedMode);
}
