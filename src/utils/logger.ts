type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function timestamp() {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    ts: timestamp(),
    level,
    message: msg,
    ...((meta && Object.keys(meta).length) ? { meta } : {}),
  };

  return JSON.stringify(payload);
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    // only print debug if NODE_ENV !== 'production'
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', msg, meta));
    }
  },
  info(msg: string, meta?: Record<string, unknown>) {
    console.info(formatMessage('info', msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(formatMessage('warn', msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    console.error(formatMessage('error', msg, meta));
  },
};

export default logger;
