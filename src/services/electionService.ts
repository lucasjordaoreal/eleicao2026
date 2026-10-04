import { officialElectionData, type CandidateResult, type ElectionSnapshot } from '../data/electionData'

export type NormalizedElection = ElectionSnapshot & {
  dataAvailable: boolean
  leader: CandidateResult | null
}

export const getElectionSnapshot = (): NormalizedElection => {
  const hasData =
    officialElectionData.sectionsTotalized > 0 ||
    officialElectionData.apuracaoPercent > 0 ||
    officialElectionData.totalVotes > 0 ||
    officialElectionData.candidates.some((candidate) => candidate.votes > 0)

  const candidates = officialElectionData.candidates.map((candidate, index) => ({
    ...candidate,
    position: candidate.position || index + 1,
  }))

  const leader =
    candidates.filter((candidate) => candidate.votes > 0).sort((a, b) => b.votes - a.votes)[0] || null

  return {
    ...officialElectionData,
    candidates,
    dataAvailable: hasData,
    leader,
  }
}
