export {};

declare global {
  namespace JSX {
    // zamiast "any" użyjemy unknown, żeby ESLint nie krzyczał
    interface IntrinsicElements {
      [elemName: string]: unknown;
    }

    // dodajemy typ Element, żeby TS nie krzyczał
    type Element = React.ReactNode;
  }
}
