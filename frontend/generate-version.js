import { writeFileSync } from 'fs';

const version = {
  buildTimestamp: Date.now()
};

writeFileSync('./public/version.json', JSON.stringify(version, null, 2));
