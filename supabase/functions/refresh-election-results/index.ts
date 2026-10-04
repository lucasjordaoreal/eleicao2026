const electionId = '6257'
const resultsUrl =
  `https://resultados.tse.jus.br/oficial/ele2026/${electionId}/dados/br/br-c0001-e00${electionId}-u.jws`
const publicKeyBytes = 'kWlpNHjuws1csyQZwzn3Fhzbi3RD435RbpThtSr4hMc'
const expectedKeyId = 'sNbt9Q_fLS65zE1_ZLNV-XRRwPY'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

const parseTseNumber = (value: unknown, field: string) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`O campo ${field} do TSE está ausente ou inválido.`)
  }

  const parsed =
    typeof value === 'number' ? value : Number(value.replace(/\./g, '').replace(',', '.'))

  if (!Number.isFinite(parsed)) {
    throw new Error(`O campo ${field} do TSE não contém um número válido.`)
  }

  return parsed
}

const createSnapshot = async () => {
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

  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)))

  if (header.alg !== 'EdDSA' || header.kid !== expectedKeyId) {
    throw new Error('O arquivo do TSE foi assinado com uma chave ou algoritmo inesperado.')
  }

  const publicKey = await crypto.subtle.importKey(
    'raw',
    decodeBase64Url(publicKeyBytes),
    { name: 'Ed25519' },
    false,
    ['verify'],
  )
  const signatureIsValid = await crypto.subtle.verify(
    'Ed25519',
    publicKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )

  if (!signatureIsValid) {
    throw new Error('A assinatura digital dos resultados do TSE não é válida.')
  }

  const election = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)))

  if (election.ele !== electionId || election.tpabr !== 'br') {
    throw new Error('O arquivo recebido não corresponde à eleição presidencial nacional de 2026.')
  }

  const presidentialOffice = election.carg?.find((office: { cd?: string }) => office.cd === '1')

  if (!presidentialOffice || !Array.isArray(presidentialOffice.agr)) {
    throw new Error('O arquivo do TSE não contém os resultados para presidente.')
  }

  const candidates = presidentialOffice.agr.flatMap(
    (group: { par?: Array<Record<string, unknown>> }) =>
      (group.par ?? []).flatMap((party) =>
        ((party.cand as Array<Record<string, unknown>> | undefined) ?? []).map((candidate) => ({
          name: candidate.nmu ?? candidate.nm,
          party: party.sg ?? party.n,
          votes: parseTseNumber(candidate.vap, 'votos do candidato'),
          percentage: parseTseNumber(candidate.pvap, 'percentual do candidato'),
          sequence: parseTseNumber(candidate.seq, 'ordem do candidato'),
        })),
      ),
  )

  if (
    candidates.length === 0 ||
    candidates.some(
      (candidate: { name: unknown; party: unknown }) =>
        typeof candidate.name !== 'string' ||
        candidate.name.length === 0 ||
        typeof candidate.party !== 'string' ||
        candidate.party.length === 0,
    )
  ) {
    throw new Error('O arquivo do TSE não contém uma lista válida de candidatos.')
  }

  const dateParts = election.dg?.split('/')
  const time = election.hg

  if (dateParts?.length !== 3 || !time) {
    throw new Error('O arquivo do TSE não contém a data e hora da apuração.')
  }

  const [day, month, year] = dateParts
  const sortedCandidates = candidates
    .sort(
      (a: { votes: number; sequence: number }, b: { votes: number; sequence: number }) =>
        b.votes - a.votes || a.sequence - b.sequence,
    )
    .map(
      (
        candidate: {
          name: string
          party: string
          votes: number
          percentage: number
        },
        index: number,
      ) => ({
        name: candidate.name,
        party: candidate.party,
        votes: candidate.votes,
        percentage: candidate.percentage,
        position: index + 1,
      }),
    )

  return {
    electionName: 'Eleição Geral Ordinária 2026',
    office: presidentialOffice.nmn ?? 'Presidente da República',
    region: 'Brasil',
    sourceLabel: 'Tribunal Superior Eleitoral (TSE)',
    sourceUrl:
      'https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/br/cargo/1/vis/nominal/resultados',
    lastUpdated: `${year}-${month}-${day}T${time}-03:00`,
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
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedSecret = request.headers.get('x-cron-secret')

  if (!cronSecret || !providedSecret || providedSecret !== cronSecret) {
    return jsonResponse({ error: 'Não autorizado.' }, 401)
  }

  try {
    const snapshot = await createSnapshot()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const serviceRoleKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('As variáveis internas do Supabase não estão configuradas.')
    }

    const writeResponse = await fetch(
      new URL('/rest/v1/election_results?on_conflict=singleton', supabaseUrl),
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          ...(serviceRoleKey.startsWith('eyJ')
            ? { Authorization: `Bearer ${serviceRoleKey}` }
            : {}),
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          singleton: true,
          snapshot,
          updated_at: new Date().toISOString(),
        }),
      },
    )

    if (!writeResponse.ok) {
      throw new Error(`Não foi possível salvar o snapshot no Supabase (${writeResponse.status}).`)
    }

    console.info(
      `Snapshot oficial atualizado: ${snapshot.sectionsTotalized}/${snapshot.totalSections} seções. TSE: ${snapshot.lastUpdated}.`,
    )
    return jsonResponse({ ok: true, lastUpdated: snapshot.lastUpdated })
  } catch (error) {
    console.error('Falha ao atualizar os resultados oficiais no Supabase.', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro inesperado ao atualizar resultados.' },
      502,
    )
  }
})
