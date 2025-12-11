# Snapshot API

Snapshots store DOM ordering and parent relationships.

## `createSnapshot(root)`

Captures ordering and structure.

```ts
import { createSnapshot } from "@whittakertech/mosaic";
```

## `restoreSnapshot(snapshot)`

Restores DOM structure from a captured snapshot.