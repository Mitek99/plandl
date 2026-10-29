import type {
  Definition,
  Diagnostic,
  DoorType,
  Expression,
  OpeningDefinition,
  ParseResult,
  PlanDocument,
  Side,
  SourceLocation,
  WallAnchor,
  WallType
} from "@plandl/core";

interface Token {
  type: "identifier" | "number" | "string" | "symbol" | "eof";
  text: string;
  value?: string | number;
  column: number;
}

function tokenize(line: string, lineNumber: number, diagnostics: Diagnostic[]): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index]!;
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "#") break;
    const column = index + 1;
    if (/[A-Za-z_]/.test(char)) {
      const match = line.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/)!;
      tokens.push({ type: "identifier", text: match[0], value: match[0], column });
      index += match[0].length;
      continue;
    }
    if (/\d|\./.test(char) && !(char === "." && !/\d/.test(line[index + 1] ?? ""))) {
      const match = line.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+)(mm|cm|m)?/);
      if (match) {
        const numeric = Number.parseFloat(match[0]);
        const value = match[1] === "m" ? numeric * 1000 : match[1] === "cm" ? numeric * 10 : numeric;
        tokens.push({ type: "number", text: match[0], value, column });
        index += match[0].length;
        continue;
      }
    }
    if (char === '"') {
      let value = "";
      let cursor = index + 1;
      let closed = false;
      while (cursor < line.length) {
        const current = line[cursor]!;
        if (current === '"') {
          closed = true;
          cursor += 1;
          break;
        }
        if (current === "\\") {
          const escaped = line[cursor + 1];
          if (escaped === undefined) break;
          value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
          cursor += 2;
        } else {
          value += current;
          cursor += 1;
        }
      }
      if (!closed) {
        diagnostics.push({ code: "UNTERMINATED_STRING", message: "Unterminated string.", severity: "error", location: { line: lineNumber, column } });
      } else {
        tokens.push({ type: "string", text: value, value, column });
      }
      index = cursor;
      continue;
    }
    if ("[](),=+*/.-".includes(char)) {
      tokens.push({ type: "symbol", text: char, value: char, column });
      index += 1;
      continue;
    }
    diagnostics.push({ code: "UNEXPECTED_CHARACTER", message: `Unexpected character: ${char}.`, severity: "error", location: { line: lineNumber, column } });
    index += 1;
  }
  tokens.push({ type: "eof", text: "", column: line.length + 1 });
  return tokens;
}

class LineParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly line: number,
    private readonly diagnostics: Diagnostic[]
  ) {}

  location(token = this.peekToken()): SourceLocation {
    return { line: this.line, column: token.column };
  }

  peekToken(): Token {
    return this.tokens[this.index]!;
  }

  peek(text: string): boolean {
    return this.peekToken().text === text;
  }

  take(): Token {
    const token = this.peekToken();
    this.index += 1;
    return token;
  }

  consume(text: string): boolean {
    if (!this.peek(text)) return false;
    this.take();
    return true;
  }

  error(code: string, message: string, token = this.peekToken()): void {
    this.diagnostics.push({ code, message, severity: "error", location: this.location(token) });
  }

  expect(text: string): Token | null {
    if (this.peek(text)) return this.take();
    this.error("EXPECTED_TOKEN", `Expected ${text}, found ${this.peekToken().text || "end of line"}.`);
    return null;
  }

  identifier(label = "identifier"): string | null {
    const token = this.peekToken();
    if (token.type !== "identifier") {
      this.error("EXPECTED_IDENTIFIER", `Expected ${label}.`, token);
      return null;
    }
    this.take();
    return token.text;
  }

  id(): string | null {
    const token = this.peekToken();
    const value = this.identifier("ID");
    if (value && !/^[a-z][a-z0-9_]*$/.test(value)) {
      this.error("INVALID_ID", `ID ${value} must use lowercase letters, digits, and underscores.`, token);
      return null;
    }
    return value;
  }

  name(): string | null {
    const token = this.peekToken();
    if (token.type !== "string") {
      this.error("EXPECTED_NAME", "Expected a quoted name.", token);
      return null;
    }
    this.take();
    return String(token.value);
  }

  expression(): Expression | null {
    return this.additive();
  }

  private additive(): Expression | null {
    let left = this.multiplicative();
    while (left && (this.peek("+") || this.peek("-"))) {
      const operator = this.take().text as "+" | "-";
      const right = this.multiplicative();
      if (!right) return null;
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }

  private multiplicative(): Expression | null {
    let left = this.unary();
    while (left && (this.peek("*") || this.peek("/"))) {
      const operator = this.take().text as "*" | "/";
      const right = this.unary();
      if (!right) return null;
      left = { kind: "binary", operator, left, right };
    }
    return left;
  }

  private unary(): Expression | null {
    if (this.peek("+") || this.peek("-")) {
      const operator = this.take().text as "+" | "-";
      const operand = this.unary();
      return operand ? { kind: "unary", operator, operand } : null;
    }
    return this.primary();
  }

  private primary(): Expression | null {
    const token = this.peekToken();
    if (token.type === "number") {
      this.take();
      return { kind: "number", value: Number(token.value) };
    }
    if (token.type === "identifier") {
      this.take();
      return { kind: "identifier", name: token.text };
    }
    if (this.consume("(")) {
      const expression = this.additive();
      if (!this.expect(")")) return null;
      return expression;
    }
    this.error("EXPECTED_EXPRESSION", "Expected a number, variable, or parenthesized expression.", token);
    return null;
  }

  finish(): void {
    if (this.peekToken().type !== "eof") {
      this.error("UNEXPECTED_TOKEN", `Unexpected token: ${this.peekToken().text}.`);
    }
  }
}

interface AttachedFields {
  hostId?: string;
  offset?: Expression;
  side?: Side;
  width?: Expression;
  height?: Expression;
  sillHeight?: Expression;
  openingType?: string;
  objectType?: string;
  gap?: Expression;
  size?: [Expression, Expression];
}

function parseWallAnchor(parser: LineParser): WallAnchor | null {
  const wallId = parser.id();
  if (!wallId || !parser.expect(".")) return null;
  const point = parser.identifier("start, end, or at");
  if (point === "start" || point === "end") return { wallId, point };
  if (point !== "at") {
    parser.error("INVALID_ANCHOR", "Anchor must be .start, .end, or .at(offset).");
    return null;
  }
  if (!parser.expect("(")) return null;
  const offset = parser.expression();
  if (!offset || !parser.expect(")")) return null;
  return { wallId, point: "at", offset };
}

function requiredFields(parser: LineParser, fields: AttachedFields, required: string[]): boolean {
  let valid = true;
  for (const field of required) {
    if (fields[field as keyof AttachedFields] === undefined) {
      parser.error("MISSING_FIELD", `Missing required field ${field}.`);
      valid = false;
    }
  }
  return valid;
}

function parseAttached(parser: LineParser, fields: AttachedFields): void {
  const seen = new Set<string>();
  while (parser.peekToken().type !== "eof") {
    const field = parser.identifier("field name");
    if (!field) return;
    if (seen.has(field)) {
      parser.error("DUPLICATE_FIELD", `Duplicate field ${field}.`);
      return;
    }
    seen.add(field);
    if (field === "ON") {
      fields.hostId = parser.id() ?? undefined;
    } else if (field === "OFFSET") {
      fields.offset = parser.expression() ?? undefined;
    } else if (field === "WIDTH") {
      fields.width = parser.expression() ?? undefined;
    } else if (field === "HEIGHT") {
      fields.height = parser.expression() ?? undefined;
    } else if (field === "SILL_HEIGHT") {
      fields.sillHeight = parser.expression() ?? undefined;
    } else if (field === "GAP") {
      fields.gap = parser.expression() ?? undefined;
    } else if (field === "SIDE") {
      const side = parser.identifier("LEFT or RIGHT");
      if (side !== "LEFT" && side !== "RIGHT") {
        parser.error("INVALID_SIDE", "SIDE must be LEFT or RIGHT.");
        return;
      }
      fields.side = side;
    } else if (field === "OPENING_TYPE") {
      fields.openingType = parser.identifier("opening type") ?? undefined;
    } else if (field === "KIND") {
      fields.objectType = parser.identifier("object kind") ?? undefined;
    } else if (field === "SIZE") {
      const along = parser.expression();
      if (!along || !parser.expect("X")) return;
      const depth = parser.expression();
      if (!depth) return;
      fields.size = [along, depth];
    } else {
      parser.error("UNKNOWN_FIELD", `Unknown field ${field}.`);
      return;
    }
  }
}

function parseDefinition(line: string, lineNumber: number, diagnostics: Diagnostic[]): Definition | null {
  const parser = new LineParser(tokenize(line, lineNumber, diagnostics), lineNumber, diagnostics);
  const keywordToken = parser.peekToken();
  if (keywordToken.type === "eof") return null;
  const keyword = parser.identifier("definition keyword");
  if (!keyword) return null;
  const location = parser.location(keywordToken);

  if (keyword === "LET") {
    const id = parser.id();
    if (!id || !parser.expect("=")) return null;
    const expression = parser.expression();
    if (!expression) return null;
    parser.finish();
    return { kind: "let", id, expression, location };
  }

  if (keyword === "WALL") {
    const wallType = parser.identifier("wall type") as WallType | null;
    if (!wallType || !["EXTERNAL", "INTERNAL", "VIRTUAL", "TERRACE"].includes(wallType)) {
      parser.error("INVALID_WALL_TYPE", "Wall type must be EXTERNAL, INTERNAL, VIRTUAL, or TERRACE.");
      return null;
    }
    const id = parser.id();
    const name = parser.name();
    if (!id || name === null) return null;
    let start: WallAnchor | undefined;
    let thickness: Expression | undefined;
    let height: Expression | undefined;
    let direction: Expression | undefined;
    let length: Expression | undefined;
    const seen = new Set<string>();
    while (parser.peekToken().type !== "eof") {
      const field = parser.identifier("wall field");
      if (!field) return null;
      if (seen.has(field)) {
        parser.error("DUPLICATE_FIELD", `Duplicate field ${field}.`);
        return null;
      }
      seen.add(field);
      if (field === "START") start = parseWallAnchor(parser) ?? undefined;
      else if (field === "THICKNESS") thickness = parser.expression() ?? undefined;
      else if (field === "HEIGHT") height = parser.expression() ?? undefined;
      else if (field === "DIRECTION") direction = parser.expression() ?? undefined;
      else if (field === "LENGTH") length = parser.expression() ?? undefined;
      else {
        parser.error("UNKNOWN_WALL_FIELD", `Unknown wall field ${field}.`);
        return null;
      }
    }
    if (!direction || !length) {
      parser.error("MISSING_WALL_FIELD", "WALL requires DIRECTION and LENGTH.");
      return null;
    }
    return { kind: "wall", wallType, id, name, start, direction, length, thickness, height, location };
  }

  if (keyword === "ROOM") {
    const id = parser.id();
    const name = parser.name();
    if (!id || name === null || !parser.expect("WALLS") || !parser.expect("[")) return null;
    const wallIds: string[] = [];
    while (!parser.peek("]") && parser.peekToken().type !== "eof") {
      const wallId = parser.id();
      if (!wallId) return null;
      wallIds.push(wallId);
      if (!parser.consume(",") && !parser.peek("]")) {
        parser.error("EXPECTED_COMMA", "Expected comma between wall IDs.");
        return null;
      }
    }
    if (!parser.expect("]")) return null;
    parser.finish();
    return { kind: "room", id, name, wallIds, location };
  }

  let doorType: DoorType | undefined;
  if (keyword === "DOOR") {
    const value = parser.identifier("door type");
    if (value !== "INTERNAL" && value !== "EXTERNAL") {
      parser.error("INVALID_DOOR_TYPE", "DOOR requires INTERNAL or EXTERNAL before its ID.");
      return null;
    }
    doorType = value;
  }
  if (!["DOOR", "WINDOW", "OPENING", "OBJECT"].includes(keyword)) {
    parser.error("UNKNOWN_DEFINITION", `Unknown definition ${keyword}.`, keywordToken);
    return null;
  }
  const id = parser.id();
  const name = parser.name();
  if (!id || name === null) return null;
  const fields: AttachedFields = {};
  parseAttached(parser, fields);
  if (!requiredFields(parser, fields, ["offset", "side"])) return null;
  const base = { id, name, hostId: fields.hostId, offset: fields.offset!, side: fields.side!, location };
  if (keyword === "DOOR") {
    if (!requiredFields(parser, fields, ["openingType"])) return null;
    return { ...base, kind: "door", doorType: doorType!, width: fields.width, height: fields.height, openingType: fields.openingType! };
  }
  if (keyword === "WINDOW") {
    if (!requiredFields(parser, fields, ["width"])) return null;
    return { ...base, kind: "window", width: fields.width!, height: fields.height, sillHeight: fields.sillHeight };
  }
  if (keyword === "OPENING") {
    if (!requiredFields(parser, fields, ["width", "openingType"])) return null;
    const opening: OpeningDefinition = { ...base, kind: "opening", width: fields.width!, height: fields.height, openingType: fields.openingType! };
    return opening;
  }
  if (!requiredFields(parser, fields, ["objectType"])) return null;
  return { ...base, kind: "object", objectType: fields.objectType!, gap: fields.gap, size: fields.size };
}

export function parsePlan(source: string): ParseResult {
  const diagnostics: Diagnostic[] = [];
  const definitions: Definition[] = [];
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim() || line.trimStart().startsWith("#")) return;
    const definition = parseDefinition(line, index + 1, diagnostics);
    if (definition) definitions.push(definition);
  });
  const document: PlanDocument = { definitions };
  return { document, diagnostics };
}
