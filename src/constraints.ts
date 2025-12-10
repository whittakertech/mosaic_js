export interface MosaicConstraint {
  allowReparent?: boolean;
  validParents?: (item: any, target: any) => boolean;
  validOrder?: (item: any, siblings: any[]) => boolean;
}

export const defaultConstraints: MosaicConstraint = {
  allowReparent: true,
};
