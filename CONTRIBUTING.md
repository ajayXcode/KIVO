# Contributing to EdgePilot (KIVO)

Thank you for your interest in contributing to **EdgePilot**! We welcome bug fixes, performance improvements, documentation updates, and new algorithmic strategies.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all contributors with respect.

---

## 2. Getting Started

### Prerequisites
- **Python 3.11+** (Python 3.13 supported)
- **Node.js 18+** & **npm 9+**
- **Git**
- A free **Delta Exchange India Testnet** account (`testnet.delta.exchange`)

### Fork and Clone
```bash
git clone https://github.com/ajayXcode/KIVO.git
cd KIVO
```

### Virtual Environment Setup
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
pip install pytest pytest-asyncio
```

### Dashboard Setup
```bash
cd dashboard
npm install
npm run build
cd ..
```

---

## 3. Development Workflow

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/order-execution-speedup
   # or
   git checkout -b fix/reconciliation-null-guard
   ```
2. Make your modifications following our code standards.
3. Verify backend tests pass:
   ```bash
   pytest -v
   ```
4. Verify frontend compiles without errors:
   ```bash
   cd dashboard && npm run build && cd ..
   ```
5. Ensure no secrets are committed!

---

## 4. Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation only changes
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding missing tests or correcting existing tests
- `chore:` Changes to build process, dependencies, or tooling

**Example:**
```bash
git commit -m "feat(execution): add dynamic ATR trailing stop-loss to option orders"
```

---

## 5. Pull Request Guidelines

1. Ensure the PR title clearly describes the change.
2. Complete all checklist items in [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
3. Keep pull requests focused on a single topic; split large, multi-concern PRs into smaller units.
4. Maintainers will review your PR and provide constructive feedback.

---

## 6. Questions & Support

For questions, open a discussion or issue on GitHub, or reach out to the project maintainer:
- **Maintainer**: `ajayXcode` (`rangeshsha@gmail.com`)
