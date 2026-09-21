// Shared by any page/component fetching one thing from the API — factored
// out once a second page needed the exact same shape Home.tsx already had.
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }
