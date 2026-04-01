export enum LogLevel {
	Info = "INFO",
	Warn = "WARN",
	Error = "ERROR",
}

export class Logger {
	info(message: string): void {
		print(`[INFO] ${message}`);
	}

	warn(message: string): void {
		print(`[WARN] ⚠️  ${message}`);
	}

	error(message: string): void {
		print(`[ERROR] ❌ ${message}`);
	}
}

export const logger = new Logger();
