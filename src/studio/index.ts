import express from 'express';
import path from 'path';

const studioApp = express();
studioApp.use(express.static(path.join(__dirname, '../../public')));

export function mountStudio(parentApp: express.Application): void {
  parentApp.use('/studio', studioApp);
  console.log('Persona Studio mounted at /studio');
}
