import { describe, it, expect } from 'vitest'
import { RepositoryError } from './errors'

describe('RepositoryError', () => {
  it('extends Error', () => {
    const err = new RepositoryError('test message')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name RepositoryError', () => {
    const err = new RepositoryError('test message')
    expect(err.name).toBe('RepositoryError')
  })

  it('sets message correctly', () => {
    const err = new RepositoryError('something went wrong')
    expect(err.message).toBe('something went wrong')
  })

  it('code is undefined when not provided', () => {
    const err = new RepositoryError('oops')
    expect(err.code).toBeUndefined()
  })

  it('accepts optional code', () => {
    const err = new RepositoryError('not found', 'PGRST116')
    expect(err.code).toBe('PGRST116')
  })
})
