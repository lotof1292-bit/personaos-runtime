import { CloudApiServer } from './CloudApiServer';

const server = new CloudApiServer();
const port = parseInt(process.env.CLOUD_API_PORT || '4871');
server.start(port);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Cloud API...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});
