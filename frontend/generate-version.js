import { writeFileSync } from 'fs';

const version = {
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now()
};

writeFileSync('./public/version.json', JSON.stringify(version, null, 2));
