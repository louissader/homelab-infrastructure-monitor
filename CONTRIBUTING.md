# Contributing to HomeLab Infrastructure Monitor

Thank you for your interest in contributing to HomeLab Infrastructure Monitor! This is primarily a portfolio project, but contributions, suggestions, and feedback are welcome.

## Project Status

This project is currently in active development:
- **Backend:** 90% complete (production-ready)
- **Agent:** 100% complete
- **Frontend:** Not yet started (next phase)

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:

1. Check if the issue already exists in [Issues](https://github.com/louissader/homelab-infrastructure-monitor/issues)
2. If not, create a new issue with:
   - Clear description of the problem/suggestion
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Your environment (OS, Python version, Docker version)

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check the [Project Status](PROJECT_STATUS.md) to see if it's already planned
2. Check existing [Issues](https://github.com/louissader/homelab-infrastructure-monitor/issues)
3. Create a new issue with the "enhancement" label
4. Describe the feature and its use case

### Code Contributions

While this is primarily a portfolio project, quality contributions are appreciated:

#### Before Starting

1. Comment on an existing issue or create one to discuss your proposed changes
2. Fork the repository
3. Create a feature branch: `git checkout -b feature/your-feature-name`

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/homelab-infrastructure-monitor.git
cd homelab-infrastructure-monitor

# Set up backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up agent
cd ../agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run tests (when available)
pytest
```

#### Code Standards

- **Python:** Follow PEP 8, use type hints, write docstrings
- **Comments:** Explain "why" not "what"
- **Testing:** Add tests for new features
- **Documentation:** Update relevant docs

#### Commit Messages

Follow the project's commit message style:

```
Component: Brief description

Detailed explanation if needed.

- Bullet points for multiple changes
- Reference issues: Fixes #123
```

Examples:
- `Backend: Add WebSocket support for real-time metrics`
- `Agent: Fix Docker container CPU calculation`
- `Docs: Update QUICKSTART with troubleshooting section`

#### Submitting Changes

1. Ensure all tests pass
2. Update documentation if needed
3. Commit your changes with clear messages
4. Push to your fork
5. Create a Pull Request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots (if UI changes)

### Areas Needing Help

If you want to contribute, these areas need work:

1. **Frontend Dashboard** (Highest priority)
   - React 18+ with TypeScript
   - TailwindCSS styling
   - Real-time metric visualization

2. **Testing**
   - Backend API tests (pytest)
   - Agent unit tests
   - Integration tests

3. **Documentation**
   - API usage examples
   - Deployment guides (AWS, Azure, GCP)
   - Troubleshooting scenarios

4. **Features**
   - WebSocket real-time streaming
   - Alert notification channels
   - Kubernetes monitoring

## Code Review Process

1. Maintainer will review your PR
2. Feedback may be provided for improvements
3. Once approved, PR will be merged
4. You'll be credited in the commit

## Questions?

Feel free to:
- Open an issue for questions
- Check existing documentation:
  - [README.md](README.md)
  - [QUICKSTART.md](QUICKSTART.md)
  - [SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
  - [PROJECT_STATUS.md](PROJECT_STATUS.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in commit messages (Co-Authored-By)
- Acknowledged in release notes
- Added to a CONTRIBUTORS file (if project grows)

Thank you for helping make HomeLab Infrastructure Monitor better!

---

**Note:** As this is a portfolio project demonstrating SysAdmin and DevOps skills, major architectural changes may not be accepted to preserve the learning demonstration aspect. However, bug fixes, optimizations, and feature additions are always welcome!
