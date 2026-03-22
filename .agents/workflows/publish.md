---
description: how to publish new versions to PyPI and NPM
---

To publish a new version of the Dataflare SDKs or MCP server, follow these steps:

1.  **Update Version Numbers**: Ensure the version fields in the following files are updated and consistent:
    - Root `pyproject.toml` or `python/pyproject.toml`
    - `typescript/package.json`
    - `mcp/package.json`
2.  **Commit Your Changes**: Commit any final adjustments and the version updates.
3.  **Create a Git Tag**: Create a new tag following the `v*.*.*` convention.
    ```bash
    git tag -a v0.1.2 -m "Release v0.1.2"
    ```
4.  **Push the Tag**: Push the tag to the remote repository.
    ```bash
    git push origin v0.1.2
    ```
5.  **Verify Automation**:
    - The `python-publish` workflow will trigger automatically for PyPI.
    - (WIP) Future workflows for NPM will follow the same pattern.
6.  **GitHub Release (Optional)**: After the tag is pushed, you can optionally create a GitHub Release from the tag to add release notes for users, but this is documentation only and not required for the technical publishing step.
