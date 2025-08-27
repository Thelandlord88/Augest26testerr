#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const BACKUP_DIR = path.join(ROOT, '__backup_duplicate_replace');

async function walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()){
      if(e.name === 'node_modules' || e.name === '.git') continue;
      files.push(...await walk(full));
    } else if(e.isFile()) files.push(full);
  }
  return files;
}

async function statSafe(p){ try{ return await fs.stat(p); }catch(e){ return null; } }

function relative(p){ return path.relative(ROOT, p); }

(async ()=>{
  const files = await walk(ROOT);
  const map = new Map();
  for(const f of files){
    const name = path.basename(f);
    if(!map.has(name)) map.set(name, []);
    map.get(name).push(f);
  }

  const duplicates = [...map.entries()].filter(([,arr]) => arr.length>1);
  console.log('Found', duplicates.length, 'duplicate basenames.');
  for(const [name, paths] of duplicates){
    // pick newest by mtime
    const stats = await Promise.all(paths.map(p=>statSafe(p)));
    const pairs = paths.map((p,i)=>({ path:p, mtime: stats[i]?.mtimeMs || 0 }));
    pairs.sort((a,b)=>b.mtime - a.mtime);
    const newest = pairs[0];
    console.log('\nProcessing group:', name, '\n  newest:', relative(newest.path));

    for(const p of pairs.slice(1)){
      // backup current p.path, then overwrite with newest
      const rel = relative(p.path);
      const bpath = path.join(BACKUP_DIR, name + '.' + Date.now());
      await fs.mkdir(path.dirname(bpath), { recursive: true });
      await fs.copyFile(p.path, bpath);
      await fs.copyFile(newest.path, p.path);
      console.log('  replaced', rel, 'with', relative(newest.path));
    }
  }

  console.log('\nDuplicate replacement complete. Backups in', BACKUP_DIR);
})().catch(err=>{ console.error(err); process.exit(1); });
