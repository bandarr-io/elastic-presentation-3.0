import { describe, it, expect } from 'vitest'
import { parseAwsCredentials, usableProfiles } from './awsCredentials'

const CREDS = `
# comment line
[default]
aws_access_key_id = AKIDDEFAULT
aws_secret_access_key = secret-default

[work]
aws_access_key_id=AKIDWORK
aws_secret_access_key=secret-work
aws_session_token = the-session-token
`

describe('parseAwsCredentials', () => {
  it('parses named profiles with their key pairs', () => {
    const profiles = parseAwsCredentials(CREDS)
    expect(profiles.default).toEqual({ accessKeyId: 'AKIDDEFAULT', secretAccessKey: 'secret-default' })
    expect(profiles.work.sessionToken).toBe('the-session-token')
  })

  it('handles the config-file "[profile name]" section style and region', () => {
    const profiles = parseAwsCredentials('[profile work]\nregion = us-west-2\n')
    expect(profiles.work.region).toBe('us-west-2')
  })

  it('ignores comments, unknown keys, and lines outside a section', () => {
    const profiles = parseAwsCredentials(
      'aws_access_key_id = orphan\n; note\n[p]\noutput = json\n# aws_access_key_id = commented\naws_access_key_id = AK')
    expect(profiles).toEqual({ p: { accessKeyId: 'AK' } })
  })

  it('is case-insensitive on key names and tolerant of junk input', () => {
    expect(parseAwsCredentials('[p]\nAWS_ACCESS_KEY_ID = AK').p.accessKeyId).toBe('AK')
    expect(parseAwsCredentials(null)).toEqual({})
    expect(parseAwsCredentials('not an ini file')).toEqual({})
  })
})

describe('usableProfiles', () => {
  it('keeps only complete key pairs and puts default first', () => {
    const list = usableProfiles(parseAwsCredentials(CREDS + '\n[broken]\naws_access_key_id = AK\n'))
    expect(list.map((p) => p.name)).toEqual(['default', 'work'])
    expect(list[1].sessionToken).toBe('the-session-token')
  })

  it('returns an empty list for empty input', () => {
    expect(usableProfiles({})).toEqual([])
    expect(usableProfiles()).toEqual([])
  })
})
