// Sistema de logging estruturado para debugging

interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;
  message: string;
  details?: any;
  userId?: string;
  url: string;
  userAgent: string;
  stackTrace?: string;
}

class ErrorLogger {
  private maxLogs = 50;
  private storageKey = 'app_error_logs';

  private createLogEntry(
    level: ErrorLogEntry['level'],
    category: string,
    message: string,
    details?: any,
    error?: Error
  ): ErrorLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: error?.stack,
    };
  }

  private saveLog(entry: ErrorLogEntry) {
    try {
      const existingLogs = this.getLogs();
      const newLogs = [entry, ...existingLogs].slice(0, this.maxLogs);
      localStorage.setItem(this.storageKey, JSON.stringify(newLogs));
    } catch (e) {
      console.error('Erro ao salvar log:', e);
    }
  }

  public error(category: string, message: string, details?: any, error?: Error) {
    const entry = this.createLogEntry('error', category, message, details, error);
    this.saveLog(entry);
    console.error(`[${category}] ${message}`, details, error);
  }

  public warn(category: string, message: string, details?: any) {
    const entry = this.createLogEntry('warn', category, message, details);
    this.saveLog(entry);
    console.warn(`[${category}] ${message}`, details);
  }

  public info(category: string, message: string, details?: any) {
    const entry = this.createLogEntry('info', category, message, details);
    this.saveLog(entry);
    console.info(`[${category}] ${message}`, details);
  }

  public debug(category: string, message: string, details?: any) {
    const entry = this.createLogEntry('debug', category, message, details);
    this.saveLog(entry);
    console.debug(`[${category}] ${message}`, details);
  }

  public getLogs(): ErrorLogEntry[] {
    try {
      const logs = localStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      console.error('Erro ao recuperar logs:', e);
      return [];
    }
  }

  public clearLogs() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('Logs limpos');
    } catch (e) {
      console.error('Erro ao limpar logs:', e);
    }
  }

  public exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Capturar erros não tratados
  public setupGlobalErrorHandlers() {
    // Erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      this.error(
        'GLOBAL_ERROR',
        'Erro JavaScript não tratado',
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        event.error
      );
    });

    // Promises rejeitadas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        'UNHANDLED_PROMISE',
        'Promise rejeitada não tratada',
        {
          reason: event.reason,
        }
      );
    });
  }
}

export const logger = new ErrorLogger();

// Configurar captura global de erros
if (typeof window !== 'undefined') {
  logger.setupGlobalErrorHandlers();
}