export type CandidateResult = {
  name: string
  party: string
  votes: number
  percentage: number
  position: number
}

export type ElectionSnapshot = {
  electionName: string
  office: string
  region: string
  sourceLabel: string
  sourceUrl: string
  lastUpdated: string
  totalSections: number
  sectionsTotalized: number
  apuracaoPercent: number
  eligibleVoters: number
  totalVotes: number
  validVotes: number
  nominalVotes: number
  blankVotes: number
  nullVotes: number
  candidates: CandidateResult[]
}

export type ElectionRound = 'first' | 'second'

export type ElectionTimelineFrame = {
  capturedAt: string
  apuracaoPercent: number
  candidates: CandidateResult[]
}

export type ElectionTimelapseData = {
  firstRound: ElectionTimelineFrame[]
  secondRound: ElectionTimelineFrame[]
  secondRoundConfirmed: boolean
}

export const officialElectionData: ElectionSnapshot = {
  electionName: 'Eleição Geral Ordinária 2026',
  office: 'Presidente da República',
  region: 'Brasil',
  sourceLabel: 'Tribunal Superior Eleitoral (TSE)',
  sourceUrl:
    'https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados',
  lastUpdated: '',
  totalSections: 0,
  sectionsTotalized: 0,
  apuracaoPercent: 0,
  eligibleVoters: 0,
  totalVotes: 0,
  validVotes: 0,
  nominalVotes: 0,
  blankVotes: 0,
  nullVotes: 0,
  candidates: [],
}

export const officialElectionTimelapse: ElectionTimelapseData = {
  firstRound: [],
  secondRound: [],
  secondRoundConfirmed: false,
}
