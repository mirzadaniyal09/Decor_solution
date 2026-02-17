import { execSync } from 'node:child_process';

const defaultPorts = [5000, 5073, 5074, 5075, 5076, 5173, 5174, 5175, 5176];

function getPorts() {
    const raw = process.env.PORTS;
    if (!raw) return defaultPorts;
    return raw
        .split(',')
        .map((p) => Number(String(p).trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
}

function findListeningPidsForPort(port) {
    const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const lines = output.split(/\r?\n/);

    const pids = new Set();

    for (const line of lines) {
        // Example:
        // TCP    127.0.0.1:5000     0.0.0.0:0      LISTENING       12345
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('TCP')) continue;
        if (!trimmed.includes(`:${port}`)) continue;
        if (!trimmed.toUpperCase().includes('LISTENING')) continue;

        const parts = trimmed.split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = Number(pidStr);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }

    return [...pids];
}

function killPid(pid) {
    try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        // eslint-disable-next-line no-console
        console.log(`Killed PID ${pid}`);
    } catch {
        // ignore (already stopped / no perms)
    }
}

function main() {
    if (process.platform !== 'win32') {
        // eslint-disable-next-line no-console
        console.log('kill-ports: non-Windows platform detected; skipping');
        return;
    }

    const ports = getPorts();
    let killedAny = false;

    for (const port of ports) {
        const pids = findListeningPidsForPort(port);
        if (pids.length === 0) continue;

        // eslint-disable-next-line no-console
        console.log(`Port ${port} is in use by PID(s): ${pids.join(', ')}`);
        for (const pid of pids) {
            killPid(pid);
            killedAny = true;
        }
    }

    if (!killedAny) {
        // eslint-disable-next-line no-console
        console.log('No listening processes found on configured ports');
    }
}

main();
