#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const configPath = path.join(__dirname, '..', '.github', 'security', 'image-policy.json');

function stripQuotes(value) {
  return value.replace(/^['\"]|['\"]$/g, '');
}

function getImagesFromCompose(composeFilePath, trackedServices) {
  const composeContent = fs.readFileSync(composeFilePath, 'utf8');
  const lines = composeContent.split(/\r?\n/);
  const images = [];

  let inServices = false;
  let currentService = null;

  for (const line of lines) {
    if (!inServices) {
      if (/^services:\s*$/.test(line)) {
        inServices = true;
      }
      continue;
    }

    // End when returning to top-level keys (e.g., networks, volumes).
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      break;
    }

    const serviceMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (serviceMatch) {
      const serviceName = serviceMatch[1];
      currentService = trackedServices.includes(serviceName) ? serviceName : null;
      continue;
    }

    if (!currentService) {
      continue;
    }

    const imageMatch = line.match(/^\s{4}image:\s*(.+)\s*$/);
    if (imageMatch) {
      images.push(stripQuotes(imageMatch[1].trim()));
      currentService = null;
    }
  }

  return [...new Set(images)];
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function formatAge(days) {
  return `${days.toFixed(1)} days`;
}

function main() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Image policy file not found: ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const minimumImageAgeDays = Number(config.minimumImageAgeDays || 14);

  const composeFile = config.composeFile || 'docker-compose.yml';
  const composeFilePath = path.join(__dirname, '..', composeFile);
  if (!fs.existsSync(composeFilePath)) {
    throw new Error(`Compose file not found: ${composeFilePath}`);
  }

  const trackedServices = Array.isArray(config.trackedServices) && config.trackedServices.length > 0
    ? config.trackedServices
    : ['keycloak-db', 'app-db', 'reverse-proxy'];

  const images = getImagesFromCompose(composeFilePath, trackedServices);

  if (!images.length) {
    console.log('No tracked service images found for age policy check.');
    return;
  }

  const nowMs = Date.now();
  const failures = [];

  console.log(`Checking image age policy (minimum age: ${minimumImageAgeDays} days)...`);
  console.log(`Tracked services: ${trackedServices.join(', ')}`);

  for (const image of images) {
    process.stdout.write(`- Pulling ${image} ... `);
    run('docker', ['pull', image]);
    console.log('ok');

    const createdRaw = run('docker', ['image', 'inspect', image, '--format', '{{json .Created}}']);
    const createdIso = JSON.parse(createdRaw);
    const createdMs = Date.parse(createdIso);

    if (Number.isNaN(createdMs)) {
      failures.push(`${image} -> unable to parse image created timestamp: ${createdIso}`);
      continue;
    }

    const ageDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
    console.log(`  created: ${createdIso} | age: ${formatAge(ageDays)}`);

    if (ageDays < minimumImageAgeDays) {
      failures.push(
        `${image} is too new (${formatAge(ageDays)}). Minimum required age is ${minimumImageAgeDays} days.`
      );
    }
  }

  if (failures.length > 0) {
    console.error('\nImage age policy violations:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nImage age policy check passed.');
}

main();
