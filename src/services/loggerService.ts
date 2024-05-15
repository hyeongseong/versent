import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

class LoggerService {
	private logger: winston.Logger;

	constructor() {
		this.logger = winston.createLogger({
		level: 'info',
		format: winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			winston.format.printf(({ level, message, timestamp, service }) => {
			return `${level}: ${timestamp} ${service}: ${message}`;
			})
		),
		transports: [
			new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
			new winston.transports.File({ filename: 'logs/combined.log' }),
			// Rotate error logs daily
			new DailyRotateFile({
				filename: 'logs/error-%DATE%.log',
				datePattern: 'YYYY-MM-DD',
				level: 'error',
				maxSize: '20m',
				maxFiles: '1d'
			}),
			// Rotate combined logs daily
			new DailyRotateFile({
				filename: 'logs/combined-%DATE%.log',
				datePattern: 'YYYY-MM-DD',
				maxSize: '20m',
				maxFiles: '1d'
			})
		],
		});

		if (process.env.NODE_ENV !== 'production') {
		this.logger.add(new winston.transports.Console({
			format: winston.format.combine(
			winston.format.colorize(),
			winston.format.printf(({ level, message, timestamp, service }) => {
				return `${level}: ${timestamp} ${service}: ${message}`;
			})
			)
		}));
		}
	}

	private log(level: string, message: string, meta?: object) {
		this.logger.log(level, message, { ...this.logger.defaultMeta, ...meta });
	}

	error(message: string, meta?: object) {
		this.log('error', message, meta);
	}

	warn(message: string, meta?: object) {
		this.log('warn', message, meta);
	}

	info(message: string, meta?: object) {
		this.log('info', message, meta);
	}

	debug(message: string, meta?: object) {
		this.log('debug', message, meta);
	}
}

export const logger = new LoggerService();
