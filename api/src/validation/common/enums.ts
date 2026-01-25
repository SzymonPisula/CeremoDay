import { z } from "zod";

export const oneOf = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { message });