import { describe, expect, it } from "bun:test";
import SqlString, {
  arrayToList,
  bufferToString,
  dateToString,
  escape,
  escapeId,
  format,
  objectToValues,
  raw,
} from "./index.js";

describe("default export", () => {
  it("exposes the full named API as object properties", () => {
    expect(SqlString.escape).toBe(escape);
    expect(SqlString.escapeId).toBe(escapeId);
    expect(SqlString.arrayToList).toBe(arrayToList);
    expect(SqlString.format).toBe(format);
    expect(SqlString.dateToString).toBe(dateToString);
    expect(SqlString.bufferToString).toBe(bufferToString);
    expect(SqlString.objectToValues).toBe(objectToValues);
    expect(SqlString.raw).toBe(raw);
  });
});

describe("escape", () => {
  it("inlines user-provided strings safely", () => {
    expect(
      "SELECT * FROM users WHERE id = " + escape("some user provided value"),
    ).toBe("SELECT * FROM users WHERE id = 'some user provided value'");
  });

  it("leaves numbers untouched", () => {
    expect(escape(42)).toBe("42");
  });

  it("converts booleans to true/false", () => {
    expect(escape(true)).toBe("true");
    expect(escape(false)).toBe("false");
  });

  it("converts undefined and null to NULL", () => {
    expect(escape(undefined)).toBe("NULL");
    expect(escape(null)).toBe("NULL");
  });

  it("turns arrays into comma-separated lists", () => {
    expect(escape(["a", "b"])).toBe("'a', 'b'");
  });

  it("turns nested arrays into grouped lists for bulk inserts", () => {
    expect(
      escape([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("('a', 'b'), ('c', 'd')");
  });

  it("turns objects into key = 'val' pairs and skips function-valued props", () => {
    expect(escape({ id: 1, title: "Hello MySQL", skip: () => "x" })).toBe(
      "`id` = 1, `title` = 'Hello MySQL'",
    );
  });

  it("calls toSqlString on objects that expose one", () => {
    const current = { toSqlString: () => "CURRENT_TIMESTAMP()" };
    expect(escape(current)).toBe("CURRENT_TIMESTAMP()");
  });

  it("converts Date objects using the local timezone by default", () => {
    const dt = new Date(2020, 5, 15, 12, 34, 56, 789); // local time
    expect(escape(dt)).toBe("'2020-06-15 12:34:56.789'");
  });

  it("converts Date objects using an explicit Z timezone", () => {
    const dt = new Date(Date.UTC(2020, 5, 15, 12, 34, 56, 789));
    expect(escape(dt, false, "Z")).toBe("'2020-06-15 12:34:56.789'");
  });

  it("converts buffer-like values to hex literals", () => {
    const buffer = {
      length: 2,
      readUInt8() {},
      toString() {
        return "0fa5";
      },
    };
    expect(escape(buffer)).toBe("X'0fa5'");
  });

  it("leaves NaN and Infinity as-is", () => {
    expect(escape(Number.NaN)).toBe("NaN");
    expect(escape(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });

  it("escapes special characters inside strings", () => {
    expect(escape("O'Reilly")).toBe("'O\\'Reilly'");
    expect(escape('a"b')).toBe("'a\\\"b'");
    expect(escape("line1\nline2")).toBe("'line1\\nline2'");
    expect(escape("back\\slash")).toBe("'back\\\\slash'");
  });
});

describe("escapeId", () => {
  it("quotes a plain identifier with backticks", () => {
    expect(escapeId("date")).toBe("`date`");
  });

  it("treats . as a qualifier by default", () => {
    expect(escapeId("posts.date")).toBe("`posts`.`date`");
  });

  it("can forbid qualified mode and treat the whole string as literal", () => {
    expect(escapeId("date.2", true)).toBe("`date.2`");
  });

  it("doubles internal backticks", () => {
    expect(escapeId("a`b")).toBe("`a``b`");
  });

  it("joins arrays of identifiers with comma + space", () => {
    expect(escapeId(["username", "email"])).toBe("`username`, `email`");
  });
});

describe("format", () => {
  it("replaces ? with escaped values", () => {
    expect(format("SELECT * FROM users WHERE id = ?", [1])).toBe(
      "SELECT * FROM users WHERE id = 1",
    );
  });

  it("supports multiple ? placeholders in order", () => {
    expect(
      format(
        "UPDATE users SET foo = ?, bar = ?, baz = ? WHERE id = ?",
        ["a", "b", "c", 1],
      ),
    ).toBe("UPDATE users SET foo = 'a', bar = 'b', baz = 'c' WHERE id = 1");
  });

  it("supports ?? for identifiers and ? for values together", () => {
    expect(
      format("SELECT ?? FROM ?? WHERE id = ?", [["username", "email"], "users", 1]),
    ).toBe("SELECT `username`, `email` FROM `users` WHERE id = 1");
  });

  it("preserves placeholder runs longer than 2", () => {
    expect(format("SELECT ??? FROM users", ["x"])).toBe("SELECT ??? FROM users");
  });

  it("returns the SQL untouched if values is null/undefined", () => {
    expect(format("SELECT 1", null)).toBe("SELECT 1");
    expect(format("SELECT 1", undefined)).toBe("SELECT 1");
  });

  it("expands an object literal SET clause via escape()", () => {
    expect(
      format("INSERT INTO posts SET ?", { id: 1, title: "Hello MySQL" }),
    ).toBe("INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'");
  });

  it("interleaves raw() values through ? placeholders untouched", () => {
    const current = raw("NOW()");
    expect(
      format("UPDATE ?? SET ? WHERE `id` = ?", [
        "users",
        { email: "foobar@example.com", modified: current },
        1,
      ]),
    ).toBe(
      "UPDATE `users` SET `email` = 'foobar@example.com', `modified` = NOW() WHERE `id` = 1",
    );
  });

  it("stops replacing once values are exhausted", () => {
    expect(format("a ? b ? c", [1])).toBe("a 1 b ? c");
  });
});

describe("raw", () => {
  it("returns an object whose toSqlString yields the original SQL", () => {
    const ts = raw("CURRENT_TIMESTAMP()");
    expect(ts.toSqlString()).toBe("CURRENT_TIMESTAMP()");
    expect(escape(ts)).toBe("CURRENT_TIMESTAMP()");
  });

  it("throws when given a non-string argument", () => {
    // @ts-expect-error - intentional bad input
    expect(() => raw(123)).toThrow(TypeError);
  });
});

describe("arrayToList", () => {
  it("flattens a single-level array", () => {
    expect(arrayToList([1, "two", null])).toBe("1, 'two', NULL");
  });

  it("groups nested arrays in parentheses", () => {
    expect(
      arrayToList([
        [1, 2],
        [3, 4],
      ]),
    ).toBe("(1, 2), (3, 4)");
  });
});

describe("objectToValues", () => {
  it("renders key = 'val' pairs and respects escapeId on keys", () => {
    expect(objectToValues({ "a`b": 1, c: "d" })).toBe("`a``b` = 1, `c` = 'd'");
  });
});

describe("dateToString", () => {
  it("returns NULL for an invalid date", () => {
    expect(dateToString(new Date("not a date"), "Z")).toBe("NULL");
  });

  it("formats a UTC date", () => {
    const dt = new Date(Date.UTC(1999, 0, 2, 3, 4, 5, 6));
    expect(dateToString(dt, "Z")).toBe("'1999-01-02 03:04:05.006'");
  });
});

describe("bufferToString", () => {
  it("renders a hex literal prefixed with X", () => {
    expect(bufferToString({ toString: () => "deadbeef" })).toBe("X'deadbeef'");
  });
});
