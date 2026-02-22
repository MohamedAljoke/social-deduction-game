export type ResolutionState = {
  protected: Set<string>;
  investigations: Map<string, string>; // actorId → target alignment
};
