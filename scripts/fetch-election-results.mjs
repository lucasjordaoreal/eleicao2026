import { createPublicKey, verify } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const electionId = '6257'
const resultsUrl = `https://resultados.tse.jus.br/oficial/ele2026/${electionId}/dados/br/br-c0001-e00${electionId}-u.jws`
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../public/election-results.json')
const publicKey = createPublicKey({
  key: {
    kty: 'OKP',
    crv: 'Ed25519',
    x: 'kWlpNHjuws1csyQZwzn3Fhzbi3RD435RbpThtSr4hMc',
  },
  format: 'jwk',
})

const parseTseNumber = (value, field) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`O campo ${field} do TSE está ausente ou inválido.`)
  }

  const parsed = typeof value === 'number'
    ? value
    : Number(value.replace(/\./g, '').replace(',', '.'))

  if (!Number.isFinite(parsed)) {
    throw new Error(`O campo ${field} do TSE não contém um número válido.`)
  }

  return parsed
}

const requestUrl = new URL(resultsUrl)
requestUrl.searchParams.set('_', Date.now().toString())

const response = await fetch(requestUrl, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, max-age=0',
    Pragma: 'no-cache',
  },
})

if (!response.ok) {
  throw new Error(`O TSE respondeu com HTTP ${response.status} ao consultar os resultados.`)
}

const signedData = (await response.text()).replace(/^\*+/, '').trim()
const [encodedHeader, encodedPayload, encodedSignature, extraPart] = signedData.split('.')

if (!encodedHeader || !encodedPayload || !encodedSignature || extraPart !== undefined) {
  throw new Error('O TSE não retornou um arquivo de resultados assinado válido.')
}

const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))

if (header.alg !== 'EdDSA' || header.kid !== 'sNbt9Q_fLS65zE1_ZLNV-XRRwPY') {
  throw new Error('O arquivo do TSE foi assinado com uma chave ou algoritmo inesperado.')
}

const signatureIsValid = verify(
  null,
  Buffer.from(`${encodedHeader}.${encodedPayload}`),
  publicKey,
  Buffer.from(encodedSignature, 'base64url'),
)

if (!signatureIsValid) {
  throw new Error('A assinatura digital dos resultados do TSE não é válida.')
}

const election = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))

if (election.ele !== electionId || election.tpabr !== 'br') {
  throw new Error('O arquivo recebido não corresponde à eleição presidencial nacional de 2026.')
}

const presidentialOffice = election.carg?.find((office) => office.cd === '1')

if (!presidentialOffice || !Array.isArray(presidentialOffice.agr)) {
  throw new Error('O arquivo do TSE não contém os resultados para presidente.')
}

const candidates = presidentialOffice.agr.flatMap((group) =>
  (group.par ?? []).flatMap((party) =>
    (party.cand ?? []).map((candidate) => ({
      name: candidate.nmu ?? candidate.nm,
      party: party.sg ?? party.n,
      votes: parseTseNumber(candidate.vap, 'votos do candidato'),
      percentage: parseTseNumber(candidate.pvap, 'percentual do candidato'),
      sequence: parseTseNumber(candidate.seq, 'ordem do candidato'),
    })),
  ),
)

if (candidates.length === 0 || candidates.some((candidate) => !candidate.name || !candidate.party)) {
  throw new Error('O arquivo do TSE não contém uma lista válida de candidatos.')
}

const dateParts = election.dg?.split('/')
const time = election.hg

if (dateParts?.length !== 3 || !time) {
  throw new Error('O arquivo do TSE não contém a data e hora da apuração.')
}

const [day, month, year] = dateParts
const updatedAt = `${year}-${month}-${day}T${time}-03:00`
const sortedCandidates = candidates
  .sort((a, b) => b.votes - a.votes || a.sequence - b.sequence)
  .map((candidate, index) => ({
    name: candidate.name,
    party: candidate.party,
    votes: candidate.votes,
    percentage: candidate.percentage,
    position: index + 1,
  }))

const snapshot = {
  electionName: 'Eleição Geral Ordinária 2026',
  office: presidentialOffice.nmn ?? 'Presidente da República',
  region: 'Brasil',
  sourceLabel: 'Tribunal Superior Eleitoral (TSE)',
  sourceUrl:
    'https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados',
  lastUpdated: updatedAt,
  totalSections: parseTseNumber(election.s?.ts, 'total de seções'),
  sectionsTotalized: parseTseNumber(election.s?.st, 'seções totalizadas'),
  apuracaoPercent: parseTseNumber(election.s?.pst, 'percentual de apuração'),
  eligibleVoters: parseTseNumber(election.e?.te, 'eleitorado apto'),
  totalVotes: parseTseNumber(election.v?.tv, 'total de votos'),
  validVotes: parseTseNumber(election.v?.vv, 'votos válidos'),
  nominalVotes: parseTseNumber(election.v?.vnom, 'votos nominais'),
  blankVotes: parseTseNumber(election.v?.vb, 'votos em branco'),
  nullVotes: parseTseNumber(election.v?.vn, 'votos nulos'),
  candidates: sortedCandidates,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`)

console.log(
  `Resultados oficiais atualizados: ${snapshot.sectionsTotalized}/${snapshot.totalSections} seções, ${snapshot.candidates.length} candidatos. Atualização TSE: ${snapshot.lastUpdated}.`,
)
