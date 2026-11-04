import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

/** 创建输出面板通道，整个扩展共用一个。 */
export function initLogger(context: vscode.ExtensionContext): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('My Extension');
    context.subscriptions.push(channel);
  }
  return channel;
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function logInfo(message: string): void {
  channel?.appendLine(`[${stamp()}] ${message}`);
}

export function logWarn(message: string): void {
  channel?.appendLine(`[${stamp()}] [WARN] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  let detail = '';
  if (error instanceof Error) {
    detail = ` ${error.stack ?? error.message}`;
  } else if (error !== undefined) {
    detail = ` ${String(error)}`;
  }
  channel?.appendLine(`[${stamp()}] [ERROR] ${message}${detail}`);
}

/** 把输出面板拉出来（保留焦点）。 */
export function showLog(): void {
  channel?.show(true);
}
