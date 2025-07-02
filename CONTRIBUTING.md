# Contributing to ASC Next Version

Thank you for your interest in contributing to ASC Next Version! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Code Style

We use ESLint and Prettier to maintain code quality:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing

Run tests before submitting a PR:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Build process or auxiliary tool changes

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add tests for new functionality
4. Keep commits atomic and well-described
5. Request review from maintainers

## Architecture

Please follow the clean architecture principles:

- **Domain Layer**: Business logic and entities
- **Application Layer**: Use cases
- **Infrastructure Layer**: External services
- **Interface Layer**: Entry points

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.
