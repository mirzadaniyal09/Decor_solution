import http from 'http';
import app from './app.js';
import { connectDb } from './config/db.js';

const port = process.env.PORT || 5000;
const host = process.env.HOST || '127.0.0.1';

await connectDb();

const server = http.createServer(app);
server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://${host}:${port}`);
});

function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`\nReceived ${signal}. Shutting down...`);
    server.close((err) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error('Error while closing server:', err);
            process.exit(1);
        }
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// nodemon uses SIGUSR2 for restarts; close the server first to avoid EADDRINUSE
process.once('SIGUSR2', () => {
    server.close(() => {
        process.kill(process.pid, 'SIGUSR2');
    });
});
