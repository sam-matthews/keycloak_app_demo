#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const blocklistPath = path.join(repoRoot, '.github', 'security', 'blocked-packages.json');
const agePolicyPath = path.join(repoRoot, '.github', 'security', 'dependency-age-policy.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectPackageVersions(lockJson) {
  const versions = new Map();
  const packages = lockJson.packages || {};

  for (const pkgMeta of Object.values(packages)) {
    if (!pkgMeta || !pkgMeta.name || !pkgMeta.version) {
      continue;
    }

    if (!versions.has(pkgMeta.name)) {
      versions.set(pkgMeta.name, new Set());
    }

    versions.get(pkgMeta.name).add(pkgMeta.version);
  }

  return versions;
}

function formatHit(lockfile, name, version) {
  return `Blocked dependency found: ${name}@${version} in ${lockfile}`;
}

function collectDirectDependencies(projectDir) {
  const packageJsonPath = path.join(repoRoot, projectDir, 'package.json');
  const lockJsonPath = path.join(repoRoot, projectDir, 'package-lock.json');

  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(lockJsonPath)) {
    return [];
  }

  const packageJson = readJson(packageJsonPath);
  const lockJson = readJson(lockJsonPath);
  const deps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {})
  };

  const direct = [];
  for (const name of Object.keys(deps)) {
    const lockKey = `node_modules/${name}`;
    const lockEntry = lockJson.packages && lockJson.packages[lockKey];
    if (!lockEntry || !lockEntry.version) {
      continue;
    }

    direct.push({
      projectDir,
      name,
      version: lockEntry.version
    });
  }

  return direct;
}

async function fetchPublishedAt(name, version, cache) {
  const cacheKey = `${name}@${version}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const encodedName = encodeURIComponent(name).replace('%40', '@');
  const url = `https://registry.npmjs.org/${encodedName}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`registry lookup failed with HTTP ${res.status}`);
  }

  const body = await res.json();
  const publishedAtRaw = body.time && body.time[version];
  if (!publishedAtRaw) {
    throw new Error('published timestamp not found in registry metadata');
  }

  const publishedAt = new Date(publishedAtRaw);
  if (Number.isNaN(publishedAt.getTime())) {
    throw new Error(`invalid published timestamp: ${publishedAtRaw}`);
  }

  cache.set(cacheKey, publishedAt);
  return publishedAt;
}

function isAllowedFreshVersion(agePolicy, name, version) {
  const allowlist = agePolicy.allowFreshVersions || {};
  const packageAllowlist = allowlist[name] || [];
  return packageAllowlist.includes(version);
}

function formatAgeHit(projectDir, name, version, minimumAgeDays, ageDays) {
  const roundedAge = Math.floor(ageDays);
  return `Dependency too new: ${name}@${version} in ${projectDir} (${roundedAge}d old, minimum ${minimumAgeDays}d)`;
}

async function main() {
  const blocklist = readJson(blocklistPath);
  const agePolicy = readJson(agePolicyPath);
  const lockfiles = ['backend/package-lock.json', 'frontend/package-lock.json'];
  const hits = [];
  const npmTimeCache = new Map();

  for (const lockfile of lockfiles) {
    const fullPath = path.join(repoRoot, lockfile);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const lockJson = readJson(fullPath);
    const versions = collectPackageVersions(lockJson);

    for (const [name, blockedVersions] of Object.entries(blocklist)) {
      const found = versions.get(name);
      if (!found) {
        continue;
      }

      for (const blockedVersion of blockedVersions) {
        if (found.has(blockedVersion)) {
          hits.push(formatHit(lockfile, name, blockedVersion));
        }
      }
    }
  }

  const minimumAgeDays = Number(agePolicy.minimumReleaseAgeDays || 0);
  const projects = Array.isArray(agePolicy.projects) ? agePolicy.projects : ['backend', 'frontend'];

  for (const projectDir of projects) {
    const directDependencies = collectDirectDependencies(projectDir);

    for (const dep of directDependencies) {
      if (isAllowedFreshVersion(agePolicy, dep.name, dep.version)) {
        continue;
      }

      try {
        const publishedAt = await fetchPublishedAt(dep.name, dep.version, npmTimeCache);
        const ageDays = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < minimumAgeDays) {
          hits.push(formatAgeHit(dep.projectDir, dep.name, dep.version, minimumAgeDays, ageDays));
        }
      } catch (err) {
        hits.push(`Could not verify age for ${dep.name}@${dep.version} in ${dep.projectDir}: ${err.message}`);
      }
    }
  }

  if (hits.length > 0) {
    console.error('Dependency policy violation(s):');
    for (const hit of hits) {
      console.error(`- ${hit}`);
    }
    process.exit(1);
  }

  console.log('Dependency policy check passed.');
}

main().catch((err) => {
  console.error(`Dependency policy check failed unexpectedly: ${err.message}`);
  process.exit(1);
});
