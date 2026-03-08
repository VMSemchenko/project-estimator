# Plan: Timestamped Output Folders

## Overview

Modify the [`OutputWriter`](apps/api/src/cli/utils/output-writer.ts:37) class to create timestamped subdirectories for each estimation run, organizing outputs better and preventing overwrites.

## Current Behavior

```
outputDir/
├── estimation-report.md
└── estimation-breakdown.csv
```

## New Behavior

```
outputDir/
├── 2026-03-08T20-45-00/
│   ├── estimation-report.md
│   └── estimation-breakdown.csv
├── 2026-03-08T21-30-15/
│   ├── estimation-report.md
│   └── estimation-breakdown.csv
└── ...
```

## Implementation Details

### 1. Add Timestamp Generation Method

Add a private method to generate ISO format timestamp:

```typescript
private generateTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
  // Results in: 2026-03-08T20-45-00
}
```

**Note:** Colons (`:`) are replaced with hyphens (`-`) for filesystem compatibility across operating systems.

### 2. Modify [`ensureOutputDir()`](apps/api/src/cli/utils/output-writer.ts:47)

Update to create a timestamped subdirectory:

```typescript
async ensureOutputDir(): Promise<string> {
  // Ensure base output directory exists
  if (!fs.existsSync(this.options.outputDir)) {
    fs.mkdirSync(this.options.outputDir, { recursive: true });
  }

  // Create timestamped subdirectory
  const timestamp = this.generateTimestamp();
  const timestampedDir = path.join(this.options.outputDir, timestamp);
  fs.mkdirSync(timestampedDir, { recursive: true });

  return timestampedDir;
}
```

### 3. Update [`writeReport()`](apps/api/src/cli/utils/output-writer.ts:56)

Modify to use the timestamped directory:

```typescript
async writeReport(report: EstimationReport): Promise<OutputFiles> {
  const timestampedDir = await this.ensureOutputDir();

  const files: OutputFiles = {
    markdown: path.join(timestampedDir, 'estimation-report.md'),
    csv: path.join(timestampedDir, 'estimation-breakdown.csv'),
  };

  // ... rest of the method remains the same
}
```

### 4. Store Timestamp for Consistency

Add a private property to store the timestamp, ensuring the same timestamp is used if methods are called multiple times:

```typescript
export class OutputWriter {
  private options: OutputWriterOptions;
  private currentTimestamp: string | null = null;

  // ...

  private getTimestamp(): string {
    if (!this.currentTimestamp) {
      this.currentTimestamp = this.generateTimestamp();
    }
    return this.currentTimestamp;
  }
}
```

## Files to Modify

| File                                                                                 | Changes                        |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| [`apps/api/src/cli/utils/output-writer.ts`](apps/api/src/cli/utils/output-writer.ts) | All modifications listed above |

## Testing Considerations

1. Verify timestamped folders are created correctly
2. Verify files are written to the timestamped subdirectory
3. Verify multiple runs create separate folders
4. Test cross-platform filesystem compatibility (macOS, Windows, Linux)

## Migration Impact

- **Breaking Change:** No - existing code using `OutputWriter` will automatically benefit from the new behavior
- **CLI Users:** Output location changes from `outputDir/` to `outputDir/YYYY-MM-DDTHH-MM-SS/`
- **Documentation:** Update any docs that reference specific output file paths
