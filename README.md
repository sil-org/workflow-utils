# Workflow Utilities

This repository contains a collection of utilities that can be used as NPM dependencies in workflow scripts (for example, Node.js scripts in Kestra flows) or in any JavaScript module. This allows you to re-use code without calling another workflow or adding a step.

## Utilities

The following categories of utilities are available under /utils:

- `helpers`: Miscellaneous utilities, such as string normalization and date manipulation.
  - lastDay
  - normalizeString
  - startsWith
- `netsuite`: NetSuite REST & SuiteQL helpers, including functions to execute SuiteQL queries.
  - getRecordPath
  - queryRecord
  - queryRecords
  - request
  - sqlString
- `sftp`: SFTP file operations, including a function to move a file by its path to a new destination on an SFTP host.
  - renameSftpFile

## Import Example

To use these utilities, install them via NPM wherever your script runs:

```bash
npm install @sil-org/workflow-utils
```

then import the category/ies of functions you want:

`import { helpers, netsuite } from '@sil-org/workflow-utils'`

## Tests

To manually run the tests...

1. Clone this repo.
2. Install the npm dependencies: `npm install`
3. Run `npm test`

Note: If you also want to run the NetSuite integration tests, copy `.env.example` to
`.env` and put the application credentials (e.g. to your NetSuite Sandbox) in the
appropriate places in the `NETSUITE_CONFIG_DEV` value. Please remember to delete the `.env` file as soon as possible after you're finished.

## Contributing

Use the recommended extensions with VSCode/VSCodium.

If using a different IDE, read the .vscode/extensions.json file and install the equivalent extensions in your environment.

Use the scripts in package.json to test, lint and format your code.

The actions will check it when you push.

The "Publish" action is triggered when a new tag (semver) is pushed in Github.
