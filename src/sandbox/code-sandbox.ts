import * as vm from "vm";

export class CodeSandbox {
  /**
   * Executes arbitrary JavaScript string in an isolated VM context.
   * Limits run execution duration to prevent infinite loops.
   */
  public static execute(code: string, timeoutMs: number = 2000): any {
    const sandbox = {
      console: {
        log: (...args: any[]) => this.logs.push(args.join(" ")),
        error: (...args: any[]) => this.logs.push("[ERROR] " + args.join(" ")),
      },
      result: null,
    };

    this.logs = [];

    // Construct isolated context environment
    const context = vm.createContext(sandbox);
    
    const script = new vm.Script(`
      (function() {
        try {
          result = (function() {
            ${code}
          })();
        } catch(e) {
          result = "[Exception] " + e.message;
        }
      })();
    `);

    try {
      script.runInContext(context, { timeout: timeoutMs });
      return {
        success: true,
        result: context.result,
        logs: this.logs,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        logs: this.logs,
      };
    }
  }

  private static logs: string[] = [];
}
