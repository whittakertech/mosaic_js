# Constraints API

## `checkConstraints(dragged, target, options)`

Returns an object describing whether the drop is allowed:

```ts
{
  allowed: boolean;
  reason?: string;
}
```

Built-in validations:

- self-drop prevention
- selector mismatch
- structural rejection  