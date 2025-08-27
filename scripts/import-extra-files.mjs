#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const SRC = path.join(ROOT, 'IN HERE FOR EXTRA FILES');
const BACKUP_DIR = path.join(ROOT, '__backup_extra_import');

async function ensureDir(dir){
  await fs.mkdir(dir, { recursive: true });
}

async function walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) files.push(...await walk(full));
    else if(e.isFile()) files.push(full);
  }
  return files;
}

function relativeFromSrc(file){
  // keep relative path inside the "IN HERE FOR EXTRA FILES" folder
  return path.relative(SRC, file);
}

async function statSafe(p){
  try{ return await fs.stat(p); }catch(e){ return null; }
}

async function copyWithBackup(srcFile, destFile){
  const destDir = path.dirname(destFile);
  await ensureDir(destDir);

  const destStat = await statSafe(destFile);
  if(destStat){
    // backup existing file
    const rel = path.relative(ROOT, destFile).replace(/[^a-zA-Z0-9_.-]/g,'_');
    const bpath = path.join(BACKUP_DIR, rel);
    await ensureDir(path.dirname(bpath));
    await fs.copyFile(destFile, bpath);
  }
  await fs.copyFile(srcFile, destFile);
}

(async ()=>{
  console.log('Import: from', SRC);
  const srcExists = await statSafe(SRC);
  if(!srcExists){
    console.error('Source folder not found:', SRC);
    process.exit(1);
  }
  const files = await walk(SRC);
  console.log('Found', files.length, 'files to consider.');

  const now = Date.now();
  const timestamp = new Date(now).toISOString().replace(/[:.]/g,'-');
  const sessionBackup = path.join(BACKUP_DIR, timestamp);

  for(const srcFile of files){
    const rel = relativeFromSrc(srcFile);
    const dest = path.join(ROOT, rel);
    const srcStat = await statSafe(srcFile);
    const destStat = await statSafe(dest);

    const srcM = srcStat?.mtimeMs || 0;
    const destM = destStat?.mtimeMs || 0;

    if(!destStat){
      // fresh copy
      await ensureDir(path.dirname(dest));
      await fs.copyFile(srcFile, dest);
      console.log('copied  +', rel);
    } else if(srcM > destM){
      // backup dest into sessionBackup then overwrite
      const bpath = path.join(sessionBackup, rel);
      await ensureDir(path.dirname(bpath));
      await fs.copyFile(dest, bpath);
      await fs.copyFile(srcFile, dest);
      console.log('updated >', rel);
    } else {
      console.log('skipped =', rel);
    }
  }

  console.log('\nImport completed. Backups of overwritten files written to', sessionBackup);
})().catch(err=>{ console.error(err); process.exit(1); });
