export enum LogLevel {
	Debug = "DEBUG",
	Info = "INFO",
	Warn = "WARN",
	Error = "ERROR",
}

export class Logger {
	private debugEnabled = false;

	setDebugEnabled(enabled: boolean): void {
		this.debugEnabled = enabled;
	}

	debug(message: string): void {
		if (this.debugEnabled) {
			print(`[DEBUG] ${message}`);
		}
	}

	info(message: string): void {
		print(`[INFO] ${message}`);
	}

	warn(message: string): void {
		warn(`[WARN] ⚠️  ${message}`);
	}

	error(message: string): void {
		warn(`[ERROR] ❌ ${message}`);
	}
}

export const logger = new Logger();
