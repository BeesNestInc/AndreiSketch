import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import _axios from 'axios';
import 'dotenv/config';

export const sha256Hex = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export const writeFileAtomic = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${crypto.randomBytes(6).toString('hex')}`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, filePath);
};

// axios instance (no baseURL here because download URLs may be absolute to other hosts)
export const axios = _axios.create({
  timeout: process.env.HTTP_TIMEOUT_MS || 30000,
  // we want to handle statuses ourselves
  validateStatus: () => true,
  // download may redirect
  maxRedirects: 5
});

