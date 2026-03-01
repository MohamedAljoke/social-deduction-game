# Clean Code & SOLID

Quick reference guides using examples from this social deduction game project.

## Guides

| Topic                                                | Description                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Testing Basics](./02-testing-basics.md)             | expect, it, describe - testing core concepts                                            |
| [Dependency Injection](./03-dependency-injection.md) | Decoupling via interfaces - depend on abstractions                                      |
| [SOLID Principles](./04-solid-principles.md)         | Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion |

## How to Read

- **New to testing?** Start with [Testing Basics](./02-testing-basics.md)
- **Understand DI first** → makes testing easier to grasp via [Dependency Injection](./03-dependency-injection.md)
- **SOLID** ties it all together in [SOLID Principles](./04-solid-principles.md)

## Code References

- Domain entities: `src/domain/entity/`
- Use cases: `src/application/`
- Ports/interfaces: `src/domain/ports/`
- Container: `src/container.ts`
