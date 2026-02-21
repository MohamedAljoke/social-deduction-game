export class Vote {
  constructor(
    public readonly voterId: string,
    public readonly targetId: string,
  ) {}
}
