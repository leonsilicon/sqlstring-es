export type Timezone = "local" | "Z" | string;

export interface SqlStringLike {
  toSqlString(): string;
}

export interface BufferLike {
  toString(encoding: "hex"): string;
}

export type SqlValue =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined
  | Date
  | BufferLike
  | SqlStringLike
  | SqlValue[]
  | { [key: string]: SqlValue };

export function escapeId(val: unknown, forbidQualified?: boolean): string;

export function escape(
  val: unknown,
  stringifyObjects?: boolean,
  timeZone?: Timezone,
): string;

export function arrayToList(array: readonly unknown[], timeZone?: Timezone): string;

export function format(
  sql: string,
  values?: unknown,
  stringifyObjects?: boolean,
  timeZone?: Timezone,
): string;

export function dateToString(date: Date | string | number, timeZone: Timezone): string;

export function bufferToString(buffer: BufferLike): string;

export function objectToValues(
  object: Record<string, unknown>,
  timeZone?: Timezone,
): string;

export function raw(sql: string): SqlStringLike;

declare const SqlString: {
  escape: typeof escape;
  escapeId: typeof escapeId;
  arrayToList: typeof arrayToList;
  format: typeof format;
  dateToString: typeof dateToString;
  bufferToString: typeof bufferToString;
  objectToValues: typeof objectToValues;
  raw: typeof raw;
};

export default SqlString;
