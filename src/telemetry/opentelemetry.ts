import opentelemetry, { Tracer, Span, SpanStatusCode } from "@opentelemetry/api";

export class AgentTelemetry {
  private static tracer: Tracer = opentelemetry.trace.getTracer("mcp-enterprise-agent");

  /**
   * Tracks execution latency, inputs, and results of an MCP tool execution.
   */
  public static async traceToolCall<T>(
    toolName: string,
    args: Record<string, any>,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(`tool:${toolName}`, async (span) => {
      span.setAttribute("mcp.tool.name", toolName);
      span.setAttribute("mcp.tool.args", JSON.stringify(args));
      
      const startTime = process.hrtime.bigint();
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        });
        span.recordException(err);
        throw err;
      } finally {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6;
        span.setAttribute("mcp.tool.duration_ms", durationMs);
        span.end();
      }
    });
  }

  /**
   * Traces token consumption and reasoning trace loops.
   */
  public static logTokenUsage(promptTokens: number, completionTokens: number): void {
    const activeSpan = opentelemetry.trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes({
        "llm.usage.prompt_tokens": promptTokens,
        "llm.usage.completion_tokens": completionTokens,
        "llm.usage.total_tokens": promptTokens + completionTokens,
      });
    }
  }
}
