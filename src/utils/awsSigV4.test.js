import { describe, it, expect } from 'vitest'
import { signRequest, canonicalURI, canonicalQuery, amzDate } from './awsSigV4'

describe('signRequest', () => {
  /* AWS's published SigV4 example: GET iam ListUsers, 2015-08-30, with the
     documented credential pair. The expected signature comes straight from
     the "Signature Version 4 signing process" walkthrough in the AWS docs. */
  it('reproduces the AWS documentation test vector', async () => {
    const headers = await signRequest({
      method: 'GET',
      url: 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08',
      region: 'us-east-1',
      service: 'iam',
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
      date: new Date('2015-08-30T12:36:00Z'),
    })

    expect(headers['x-amz-date']).toBe('20150830T123600Z')
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, ' +
      'SignedHeaders=content-type;host;x-amz-date, ' +
      'Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7')
  })

  it('signs the session token when temporary credentials are used', async () => {
    const headers = await signRequest({
      url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/m/converse',
      region: 'us-east-1',
      service: 'bedrock',
      accessKeyId: 'AKIDEXAMPLE',
      secretAccessKey: 'secret',
      sessionToken: 'the-token',
      body: '{}',
      date: new Date('2026-01-01T00:00:00Z'),
    })
    expect(headers['x-amz-security-token']).toBe('the-token')
    expect(headers.authorization).toContain('x-amz-security-token')
  })

  it('changes the signature when the body changes', async () => {
    const sign = (body) => signRequest({
      url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/m/converse',
      region: 'us-east-1', service: 'bedrock',
      accessKeyId: 'AK', secretAccessKey: 'secret', body,
      date: new Date('2026-01-01T00:00:00Z'),
    })
    const [a, b] = await Promise.all([sign('{"a":1}'), sign('{"a":2}')])
    expect(a.authorization).not.toBe(b.authorization)
  })
})

describe('canonical pieces', () => {
  it('double-encodes path segments, which Bedrock model ids rely on', () => {
    // ':' in "…-v1:0" is %3A on the wire and %253A in the canonical URI
    const wire = `/model/${encodeURIComponent('us.anthropic.claude-sonnet-4-5-20250929-v1:0')}/converse`
    expect(canonicalURI(new URL(`https://x.amazonaws.com${wire}`).pathname))
      .toBe('/model/us.anthropic.claude-sonnet-4-5-20250929-v1%253A0/converse')
    expect(canonicalURI('/')).toBe('/')
  })

  it('sorts and RFC-3986-encodes query parameters', () => {
    const params = new URL('https://x.amazonaws.com/?b=2&a=1&a=0&c=a*b').searchParams
    expect(canonicalQuery(params)).toBe('a=0&a=1&b=2&c=a%2Ab')
  })

  it('formats timestamps the way SigV4 expects', () => {
    expect(amzDate(new Date('2015-08-30T12:36:00Z'))).toBe('20150830T123600Z')
  })
})
