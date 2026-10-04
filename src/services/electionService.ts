import { officialElectionData, type CandidateResult, type ElectionSnapshot } from '../data/electionData'

export type NormalizedElection = ElectionSnapshot & {
  dataAvailable: boolean
  leader: CandidateResult | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isCandidateResult = (value: unknown): value is CandidateResult =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.party === 'string' &&
  typeof value.votes === 'number' &&
  Number.isFinite(value.votes) &&
  typeof value.percentage === 'number' &&
  Number.isFinite(value.percentage) &&
  typeof value.position === 'number' &&
  Number.isFinite(value.position)

const isElectionSnapshot = (value: unknown): value is ElectionSnapshot =>
  isRecord(value) &&
  typeof value.electionName === 'string' &&
  typeof value.office === 'string' &&
  typeof value.region === 'string' &&
  typeof value.sourceLabel === 'string' &&
  typeof value.sourceUrl === 'string' &&
  typeof value.lastUpdated === 'string' &&
  [
    value.totalSections,
    value.sectionsTotalized,
    value.apuracaoPercent,
    value.eligibleVoters,
    value.totalVotes,
    value.validVotes,
    value.nominalVotes,
    value.blankVotes,
    value.nullVotes,
  ].every((number) => typeof number === 'number' && Number.isFinite(number)) &&
  Array.isArray(value.candidates) &&
  value.candidates.every(isCandidateResult)

export const getElectionSnapshot = (
  snapshot: ElectionSnapshot = officialElectionData,
): NormalizedElection => {
  const hasData =
    snapshot.sectionsTotalized > 0 ||
    snapshot.apuracaoPercent > 0 ||
    snapshot.totalVotes > 0 ||
    snapshot.candidates.some((candidate) => candidate.votes > 0)

  const candidates = snapshot.candidates.map((candidate, index) => ({
    ...candidate,
    position: candidate.position || index + 1,
  }))

  const leader =
    candidates.filter((candidate) => candidate.votes > 0).sort((a, b) => b.votes - a.votes)[0] || null

  return {
    ...snapshot,
    candidates,
    dataAvailable: hasData,
    leader,
  }
}

export const loadElectionSnapshot = async (
  signal?: AbortSignal,
): Promise<NormalizedElection> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
    throw new Error('A configuração do Supabase está incompleta.')
  }

  if (supabaseUrl && supabasePublishableKey) {
    const resultsUrl = new URL('/rest/v1/election_results', supabaseUrl)
    resultsUrl.searchParams.set('select', 'snapshot')
    resultsUrl.searchParams.set('singleton', 'eq.true')

    const response = await fetch(resultsUrl, {
      cache: 'no-store',
      headers: {
        apikey: supabasePublishableKey,
      },
      signal,
    })

    if (!response.ok) {
      throw new Error(`Não foi possível carregar os resultados do Supabase (${response.status}).`)
    }

    const rows: unknown = await response.json()

    if (!Array.isArray(rows) || rows.length !== 1 || !isElectionSnapshot(rows[0]?.snapshot)) {
      throw new Error('O Supabase ainda não contém um snapshot de resultados válido.')
    }

    return getElectionSnapshot(rows[0].snapshot)
  }

  const snapshotUrl = new URL(
    `${import.meta.env.BASE_URL}election-results.json`,
    window.location.origin,
  )
  snapshotUrl.searchParams.set('_', Date.now().toString())

  const response = await fetch(snapshotUrl, {
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Não foi possível carregar os resultados publicados (${response.status}).`)
  }

  const data: unknown = await response.json()

  if (!isElectionSnapshot(data)) {
    throw new Error('O arquivo de resultados publicados tem um formato inválido.')
  }

  return getElectionSnapshot(data)
}
