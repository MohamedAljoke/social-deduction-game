import { Response } from "express";
import { DomainError } from "../domain/errors";

export const handleError = (err: unknown, res: Response): void => {
  if (err instanceof DomainError) {
    const status = err.code === "match_not_found" ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.code });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
};
