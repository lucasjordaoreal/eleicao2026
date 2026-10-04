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
  lastUpdated: '2026-10-03T14:47:37',
  totalSections: 499248,
  sectionsTotalized: 0,
  apuracaoPercent: 0,
  totalVotes: 0,
  validVotes: 0,
  nominalVotes: 0,
  blankVotes: 0,
  nullVotes: 0,
  candidates: [
    { name: 'LULA', party: 'PT', votes: 0, percentage: 0, position: 1 },
    { name: 'RONALDO CAIADO', party: 'PSD', votes: 0, percentage: 0, position: 2 },
    { name: 'EDMILSON COSTA', party: 'PCB', votes: 0, percentage: 0, position: 3 },
    { name: 'RUI COSTA PIMENTA', party: 'PCO', votes: 0, percentage: 0, position: 4 },
    { name: 'ESCRITOR AUGUSTO CURY', party: 'AVANTE', votes: 0, percentage: 0, position: 5 },
    { name: 'ZEMA', party: 'NOVO', votes: 0, percentage: 0, position: 6 },
    { name: 'VETERINÁRIO WILSON GRASSI', party: 'DEM', votes: 0, percentage: 0, position: 7 },
    { name: 'HERTZ DIAS', party: 'PSTU', votes: 0, percentage: 0, position: 8 },
    { name: 'FLAVIO BOLSONARO', party: 'PL', votes: 0, percentage: 0, position: 9 },
    { name: 'RENAN SANTOS', party: 'MISSÃO', votes: 0, percentage: 0, position: 10 },
    { name: 'CLARIANA BARAO', party: 'DC', votes: 0, percentage: 0, position: 11 },
    { name: 'SAMARA', party: 'UP', votes: 0, percentage: 0, position: 12 },
  ],
}

export const officialElectionTimelapse: ElectionTimelapseData = {
  firstRound: [],
  secondRound: [],
  secondRoundConfirmed: false,
}
