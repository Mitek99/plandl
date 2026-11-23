import { FURNITURE_TYPES } from "@plandl/core";
import type {
  Definition,
  Diagnostic,
  FurnitureType,
  InferredProperties,
  ParameterValue,
  ParseResult,
  PlanDocument,
  Scalar,
  SourceLocation
} from "@plandl/core";

interface Token {
  type: "identifier" | "number" | "string" | "symbol" | "eof";
  text: string;
  value?: string | Scalar;
  column: number;
}

type Fields = Record<string, ParameterValue>;

const ROOM_FIELDS = ["NAME", "X", "Y", "MERGE"];
const ROOM_INFERENCE = ["INNER_DIMENSIONS", "AREA"];
const FURNITURE_FIELDS = ["WALL", "OFFSET", "PADDING", "WIDTH", "DEPTH"];

function commandFields(command: string): { explicit: string[]; inferred: string[] } | undefined {
  if (command === "GRID") return { explicit: ["STEPS_X", "STEPS_Y"], inferred: ["OUTER_DIMENSIONS", "OUTER_AREA", "PERIMETER"] };
  if (command === "ROOM" || command === "TERRACE") return { explicit: ROOM_FIELDS, inferred: ROOM_INFERENCE };
  if (command === "DEFAULT") return { explicit: ["INNER_THICKNESS", "BEARING_THICKNESS", "OUTER_THICKNESS"], inferred: [] };
  if (command === "BEARING") return { explicit: ["X", "Y"], inferred: [] };
  if (command === "WINDOW" || command === "OPENING") return { explicit: ["WALL", "OFFSET", "WIDTH"], inferred: [] };
  if (command === "DOOR") return { explicit: ["WALL", "OFFSET", "WIDTH", "HINGE", "OPENING"], inferred: [] };
  if ((FURNITURE_TYPES as readonly string[]).includes(command)) return { explicit: FURNITURE_FIELDS, inferred: [] };
  return undefined;
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
    if (/\d/.test(char) || (char === "." && /\d/.test(line[index + 1] ?? ""))) {
      const match = line.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+)(sqm|mm|cm|m)?/);
      if (match) {
        const raw = match[0];
        const unit = match[1] as Scalar["unit"];
        const scalar: Scalar = {
          value: Number.parseFloat(raw),
          unit,
          raw,
          location: { line: lineNumber, column }
        };
        tokens.push({ type: "number", text: raw, value: scalar, column });
        index += raw.length;
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
    if ("[],=-".includes(char)) {
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

  peekToken(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)]!;
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

  value(): ParameterValue | null {
    if (this.consume("[")) {
      const values: Array<string | Scalar> = [];
      while (!this.peek("]") && this.peekToken().type !== "eof") {
        const value = this.scalarOrString();
        if (value === null) return null;
        values.push(value);
        if (!this.consume(",") && !this.peek("]")) {
          this.error("EXPECTED_COMMA", "Expected a comma between array values.");
          return null;
        }
      }
      if (!this.expect("]")) return null;
      return values;
    }
    return this.scalarOrString();
  }

  private scalarOrString(): string | Scalar | null {
    const negative = this.consume("-");
    const token = this.peekToken();
    if (token.type === "number") {
      this.take();
      const scalar = token.value as Scalar;
      if (!negative) return scalar;
      return { ...scalar, value: -scalar.value, raw: `-${scalar.raw}`, location: this.location(token) };
    }
    if (negative) {
      this.error("EXPECTED_SCALAR", "Expected a number after -.", token);
      return null;
    }
    if (token.type === "identifier" || token.type === "string") {
      this.take();
      return String(token.value);
    }
    this.error("EXPECTED_VALUE", "Expected a string, scalar, or array.", token);
    return null;
  }
}

function scalar(value: ParameterValue | undefined): Scalar | undefined {
  return value !== undefined && !Array.isArray(value) && typeof value !== "string" ? value : undefined;
}

function stringValue(value: ParameterValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function scalarArray(value: ParameterValue | undefined): Scalar[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry !== "string") ? value as Scalar[] : undefined;
}

function stringArray(value: ParameterValue | undefined): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value as string[] : undefined;
}

function parseDefinition(line: string, lineNumber: number, diagnostics: Diagnostic[]): Definition | null {
  const initialDiagnostics = diagnostics.length;
  const parser = new LineParser(tokenize(line, lineNumber, diagnostics), lineNumber, diagnostics);
  if (parser.peekToken().type === "eof") return null;
  const inferredDefinition = parser.peek("INFER");
  if (inferredDefinition) parser.take();
  const keywordToken = parser.peekToken();
  const keyword = parser.identifier("command");
  if (!keyword) return null;
  const location = parser.location(keywordToken);
  const schema = commandFields(keyword);
  if (!schema) {
    parser.error("UNKNOWN_COMMAND", `Unknown command ${keyword}.`, keywordToken);
    return null;
  }
  if (inferredDefinition && keyword !== "WINDOW" && keyword !== "DOOR" && keyword !== "OPENING") {
    parser.error("INVALID_INFERRED_DEFINITION", "Only WINDOW, DOOR, and OPENING definitions can use leading INFER.", keywordToken);
    return null;
  }

  const fields: Fields = {};
  const inferred: InferredProperties = {};
  let infer = false;
  while (parser.peekToken().type !== "eof") {
    if (parser.peek("INFER") && parser.peekToken(1).text !== "=") {
      const modifier = parser.take();
      if (infer) parser.error("DUPLICATE_MODIFIER", "INFER may appear only once.", modifier);
      infer = true;
      continue;
    }
    const fieldToken = parser.peekToken();
    const field = parser.identifier("parameter name");
    if (!field || !parser.expect("=")) return null;
    const target = infer ? inferred : fields;
    if (fields[field] !== undefined || inferred[field] !== undefined) {
      parser.error("DUPLICATE_PARAMETER", `Duplicate parameter ${field}.`, fieldToken);
      return null;
    }
    const allowed = infer ? schema.inferred : schema.explicit;
    if (!allowed.includes(field)) {
      parser.error(
        "UNKNOWN_PARAMETER",
        infer ? `${field} cannot be inferred for ${keyword}.` : `Unknown ${keyword} parameter ${field}.`,
        fieldToken
      );
      return null;
    }
    const value = parser.value();
    if (value === null) return null;
    target[field] = value;
  }

  const missing = (field: string): boolean => {
    if (fields[field] !== undefined) return false;
    parser.error("MISSING_PARAMETER", `${keyword} requires ${field}.`, keywordToken);
    return true;
  };
  const invalid = (field: string, expected: string): void => {
    parser.error("INVALID_PARAMETER", `${keyword} ${field} must be ${expected}.`, keywordToken);
  };

  if (keyword === "GRID") {
    missing("STEPS_X");
    missing("STEPS_Y");
    const stepsX = scalarArray(fields.STEPS_X);
    const stepsY = scalarArray(fields.STEPS_Y);
    if (!stepsX?.length) invalid("STEPS_X", "a nonempty array of scalars");
    if (!stepsY?.length) invalid("STEPS_Y", "a nonempty array of scalars");
    if (diagnostics.length > initialDiagnostics) return null;
    return { kind: "grid", stepsX: stepsX!, stepsY: stepsY!, inferred, location };
  }

  if (keyword === "ROOM" || keyword === "TERRACE") {
    missing("NAME");
    missing("X");
    missing("Y");
    const name = stringValue(fields.NAME);
    const x = scalarArray(fields.X);
    const y = scalarArray(fields.Y);
    const merge = fields.MERGE === undefined ? [] : stringArray(fields.MERGE);
    if (name === undefined || name.length === 0) invalid("NAME", "a nonempty string");
    if (x?.length !== 2) invalid("X", "an array of two grid indices");
    if (y?.length !== 2) invalid("Y", "an array of two grid indices");
    if (!merge) invalid("MERGE", "an array of room names");
    if (diagnostics.length > initialDiagnostics) return null;
    return {
      kind: keyword === "ROOM" ? "room" : "terrace",
      name: name!,
      x: x as [Scalar, Scalar],
      y: y as [Scalar, Scalar],
      merge: merge!,
      inferred,
      location
    };
  }

  if (keyword === "DEFAULT") {
    const innerThickness = scalar(fields.INNER_THICKNESS);
    const bearingThickness = scalar(fields.BEARING_THICKNESS);
    const outerThickness = scalar(fields.OUTER_THICKNESS);
    if (fields.INNER_THICKNESS !== undefined && !innerThickness) invalid("INNER_THICKNESS", "a scalar");
    if (fields.BEARING_THICKNESS !== undefined && !bearingThickness) invalid("BEARING_THICKNESS", "a scalar");
    if (fields.OUTER_THICKNESS !== undefined && !outerThickness) invalid("OUTER_THICKNESS", "a scalar");
    if (Object.keys(fields).length === 0) parser.error("MISSING_PARAMETER", "DEFAULT requires at least one thickness.", keywordToken);
    if (diagnostics.length > initialDiagnostics) return null;
    return { kind: "default", innerThickness, bearingThickness, outerThickness, location };
  }

  if (keyword === "BEARING") {
    const x = fields.X === undefined ? [] : scalarArray(fields.X);
    const y = fields.Y === undefined ? [] : scalarArray(fields.Y);
    if (!x) invalid("X", "an array of grid indices");
    if (!y) invalid("Y", "an array of grid indices");
    if (x?.length === 0 && y?.length === 0) parser.error("MISSING_PARAMETER", "BEARING requires X or Y.", keywordToken);
    if (diagnostics.length > initialDiagnostics) return null;
    return { kind: "bearing", x: x!, y: y!, location };
  }

  if (keyword === "WINDOW" || keyword === "DOOR" || keyword === "OPENING") {
    missing("WALL");
    missing("OFFSET");
    missing("WIDTH");
    const wall = stringValue(fields.WALL);
    const offset = scalar(fields.OFFSET);
    const width = scalar(fields.WIDTH);
    const hinge = stringValue(fields.HINGE);
    const swing = stringValue(fields.OPENING);
    if (!wall) invalid("WALL", "a room wall string such as Bedroom_EAST");
    if (!offset) invalid("OFFSET", "a scalar");
    if (!width) invalid("WIDTH", "a scalar");
    if (hinge !== undefined && hinge !== "LEFT" && hinge !== "RIGHT") invalid("HINGE", "LEFT or RIGHT");
    if (swing !== undefined && swing !== "INWARD" && swing !== "OUTWARD") invalid("OPENING", "INWARD or OUTWARD");
    if (diagnostics.length > initialDiagnostics) return null;
    return {
      kind: "opening",
      openingType: keyword,
      wall: wall!,
      offset: offset!,
      width: width!,
      hinge: hinge as "LEFT" | "RIGHT" | undefined,
      swing: swing as "INWARD" | "OUTWARD" | undefined,
      isInferred: inferredDefinition,
      location
    };
  }

  missing("WALL");
  missing("OFFSET");
  missing("WIDTH");
  const wall = stringValue(fields.WALL);
  const offset = scalar(fields.OFFSET);
  const padding = scalar(fields.PADDING);
  const width = scalar(fields.WIDTH);
  const depth = scalar(fields.DEPTH);
  if (!wall) invalid("WALL", "a room wall string such as Bedroom_SOUTH");
  if (!offset) invalid("OFFSET", "a scalar");
  if (fields.PADDING !== undefined && !padding) invalid("PADDING", "a scalar");
  if (!width) invalid("WIDTH", "a scalar");
  if (fields.DEPTH !== undefined && !depth) invalid("DEPTH", "a scalar");
  if (diagnostics.length > initialDiagnostics) return null;
  return {
    kind: "furniture",
    furnitureType: keyword as FurnitureType,
    wall: wall!,
    offset: offset!,
    padding,
    width: width!,
    depth,
    location
  };
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
