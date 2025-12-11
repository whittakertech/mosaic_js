# Getting Started

Install Mosaic:

```bash
npm install @whittakertech/mosaic
```

Create a Mosaic instance:

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

Mosaic manages:

- drag lifecycle
- DOM snapshots
- rollback on invalid moves
- constraint validation
- state transitions  