export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}
