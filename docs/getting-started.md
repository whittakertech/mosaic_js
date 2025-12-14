# Getting Started

Install MosaicJS:

```bash
npm install @whittakertech/mosaic
```

Create a MosaicJS instance:

```ts
import { Mosaic } from "@whittakertech/mosaic";

const mosaic = new Mosaic({
  root: document.getElementById("root")!,
  selectors: {
    node: ".item"
  }
});

mosaic.initialize();
```

MosaicJS manages:

- drag lifecycle
- DOM snapshots
- rollback on invalid moves
- constraint validation
- state transitions  