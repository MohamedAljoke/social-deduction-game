import { z } from "zod";
import { ValidationError } from "../../../domain/errors";
import { HttpHandler } from "../server";

export function validateBody<T>(schema: z.ZodSchema<T>): HttpHandler {
  return async (req) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      throw new ValidationError(messages);
    }

    req.body = result.data;
  };
}
