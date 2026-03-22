# Why Tag-Based Publishing?

In the Dataflare SDK monorepo, we use Git tags (e.g., `v1.2.3`) as the single source of truth for versioning and automated publishing. This decision was made to simplify the release workflow and ensure consistency across all sub-packages (Python, TypeScript, Go, and MCP).

## Benefits

1.  **Single Source of Truth**: A Git tag is a permanent, immutable reference in the repository history. By triggering publishing on tags, we ensure that the exact code associated with a version is what gets built and uploaded to package registries (PyPI, NPM).
2.  **Granular Control**: Tags allow us to push versions for individual packages if necessary (e.g., `python-v1.0.0`, `typescript-v1.1.0`) although we generally aim for periodic unified releases.
3.  **CI/CD Integration**: Most advanced CI/CD tools, including GitHub Actions, are optimized for tag-based triggers. This allows for zero-manual-step deployments—simply tag the commit and the automation handles the rest.
4.  **Decoupling from GitHub UI**: Relying on tags instead of "GitHub Releases" makes the deployment process platform-independent. If the repository is ever mirrored or moved to another host (like GitLab or a private server), the tag-based automation remains robust.
5.  **Auditability**: Anyone with clone access to the repository can see the exact release history and provenance by running `git tag -l`, without needing access to the GitHub web interface.

## How to Release
Detailed instructions on how to use these tags to trigger a release can be found in our [Publish Workflow](.agents/workflows/publish.md).
