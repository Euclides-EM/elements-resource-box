import fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.resolve(process.cwd(), "dev_server_logs.txt");

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const formatLogMessage = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): string => {
  const timestamp = new Date().toISOString();
  let contextStr = "";
  try {
    contextStr = context ? ` - Context: ${JSON.stringify(context)}` : "";
  } catch {
    // Ignore JSON stringify errors
  }
  return `[${timestamp}] ${level}: ${message}${contextStr}\n`;
};

const writeToFile = (content: string): void => {
  try {
    fs.appendFileSync(LOG_FILE_PATH, content, "utf8");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
};

export const log = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void => {
  const logMessage = formatLogMessage(level, message, context);

  console.log(logMessage.trim());
  writeToFile(logMessage);
};

export const logInfo = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  log(LogLevel.INFO, message, context);
};

export const logWarn = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  log(LogLevel.WARN, message, context);
};

export const logError = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  log(LogLevel.ERROR, message, context);
};
