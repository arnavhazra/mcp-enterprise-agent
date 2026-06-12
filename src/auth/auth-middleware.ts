import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface AuthContext {
  userId: string;
  roles: string[];
  scopes: string[];
}

export class AuthMiddlewareInterceptor {
  /**
   * Evaluates mock JWT bearer tokens or SAML claims.
   * Format expectation: "Bearer <mock_user_id>:<role1,role2>:<scope1,scope2>"
   */
  public static authenticate(authHeader: string | undefined): AuthContext {
    if (!authHeader) {
      // Fallback for default sandboxed credentials
      return {
        userId: "anonymous",
        roles: ["guest"],
        scopes: ["sandbox:read"],
      };
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme.toLowerCase() !== "bearer" || !token) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Malformed authorization header. Expected 'Bearer <token>' format."
      );
    }

    const parts = token.split(":");
    if (parts.length < 3) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Malformed token payload structures."
      );
    }

    const userId = parts[0];
    const roles = parts[1].split(",");
    const scopes = parts[2].split(",");

    return { userId, roles, scopes };
  }

  /**
   * Enforces role-based or scope-based assertions prior to tool execution.
   */
  public static authorize(context: AuthContext, requiredScope: string): void {
    const hasScope = context.scopes.includes(requiredScope) || context.roles.includes("admin");
    if (!hasScope) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Authorization Failed: Scope '${requiredScope}' is required for this action.`
      );
    }
  }
}
