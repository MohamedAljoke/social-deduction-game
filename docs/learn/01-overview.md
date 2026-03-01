# Clean Code & SOLID

Quick reference guides using examples from this social deduction game project.

## Guides

| # | Topic | Description |
|---|-------|-------------|
| 06 | [Clean Architecture](./06-clean-architecture.md) | Layers: domain, application, infrastructure |
| 02 | [Testing Basics](./02-testing-basics.md) | expect, it, describe - testing core concepts |
| 03 | [Dependency Injection](./03-dependency-injection.md) | Receiving dependencies via constructor |
| 04 | [Container & IoC](./04-container-ioc.md) | Managing dependencies with a container |
| 05 | [SOLID Principles](./05-solid-principles.md) | Five design guidelines |

## How to Read

1. **Layers** → Start with [Clean Architecture](./06-clean-architecture.md)
2. **Testing** → [Testing Basics](./02-testing-basics.md)
3. **DI** → [Dependency Injection](./03-dependency-injection.md) explains the concept
4. **Wiring** → [Container & IoC](./04-container-ioc.md) shows how it all connects
5. **Theory** → [SOLID Principles](./05-solid-principles.md) ties it together

## Code References

- Domain entities: `src/domain/entity/`
- Use cases: `src/application/`
- Ports/interfaces: `src/domain/ports/`
- Container: `src/container.ts`
