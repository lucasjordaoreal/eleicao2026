import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  officialElectionTimelapse,
  type ElectionRound,
  type ElectionTimelapseData,
} from './data/electionData'
import { getElectionSnapshot } from './services/electionService'

const featuredCandidateOrder = new Map([
  ['RENAN SANTOS', 0],
  ['LULA', 1],
  ['FLAVIO BOLSONARO', 2],
])
const featuredCandidateClass = new Map([
  ['RENAN SANTOS', 'candidate-featured-renan'],
  ['LULA', 'candidate-featured-lula'],
  ['FLAVIO BOLSONARO', 'candidate-featured-flavio'],
])

const formatNumber = (value: number) => value.toLocaleString('pt-BR')
const formatPercent = (value: number) =>
  `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`

function AnimatedCounter({
  value,
  format,
  active,
}: {
  value: number
  format: (value: number) => string
  active: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.6 })
  const prefersReducedMotion = useReducedMotion()
  const count = useMotionValue(0)
  const spring = useSpring(count, { damping: 34, stiffness: 95, mass: 0.8 })
  const display = useTransform(spring, (current) => format(current))

  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion) {
      count.set(value)
      return
    }
    if (!isInView) return

    const controls = animate(count, value, {
      duration: 1.45,
      ease: [0.16, 1, 0.3, 1],
    })
    return controls.stop
  }, [active, count, isInView, prefersReducedMotion, value])

  return <motion.span ref={ref}>{display}</motion.span>
}

function ElectionTimelapse({
  timeline,
  prefersReducedMotion,
}: {
  timeline: ElectionTimelapseData
  prefersReducedMotion: boolean
}) {
  const [round, setRound] = useState<ElectionRound>('first')
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const frames =
    round === 'first'
      ? [...timeline.firstRound].sort(
          (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
        )
      : [...timeline.secondRound].sort(
          (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
        )
  const hasSecondRound = timeline.secondRoundConfirmed && timeline.secondRound.length > 0
  const currentFrame = frames[frameIndex] ?? null

  useEffect(() => {
    if (!isPlaying || frames.length < 2) return

    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= frames.length - 1) {
          setIsPlaying(false)
          return 0
        }
        return current + 1
      })
    }, prefersReducedMotion ? 2600 : 1500)

    return () => window.clearInterval(timer)
  }, [frames.length, isPlaying, prefersReducedMotion])

  const activeCandidates = currentFrame
    ? [...currentFrame.candidates].sort((a, b) => a.position - b.position)
    : []
  const roundLabel = round === 'first' ? '1º turno' : '2º turno'
  const capturedDate = currentFrame
    ? new Date(currentFrame.capturedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : ''

  return (
    <section className="timelapse-panel" aria-labelledby="timelapse-title">
      <div className="timelapse-heading">
        <div>
          <span className="section-kicker">Linha do tempo oficial</span>
          <h2 id="timelapse-title">A corrida, no tempo</h2>
          <p>Veja como a classificação mudou entre atualizações da apuração.</p>
        </div>
        <span className="timelapse-source">Base: atualizações oficiais</span>
      </div>

      <div className="timelapse-tabs" role="tablist" aria-label="Turno da eleição">
        <button
          id="timelapse-first-tab"
          type="button"
          role="tab"
          aria-selected={round === 'first'}
          aria-controls="timelapse-content"
          className={round === 'first' ? 'active' : ''}
          onClick={() => {
            setRound('first')
            setFrameIndex(0)
            setIsPlaying(false)
          }}
        >
          1º turno
        </button>
        <button
          id="timelapse-second-tab"
          type="button"
          role="tab"
          aria-selected={round === 'second'}
          aria-controls="timelapse-content"
          className={round === 'second' ? 'active' : ''}
          disabled={!hasSecondRound}
          title={!hasSecondRound ? 'Disponível após confirmação e coleta de dados oficiais' : undefined}
          onClick={() => {
            setRound('second')
            setFrameIndex(0)
            setIsPlaying(false)
          }}
        >
          2º turno
          {!hasSecondRound && <span className="tab-lock">quando houver</span>}
        </button>
      </div>

      <div
        id="timelapse-content"
        className="timelapse-content"
        role="tabpanel"
        aria-labelledby={round === 'first' ? 'timelapse-first-tab' : 'timelapse-second-tab'}
      >
        {currentFrame ? (
          <>
            <div className="timelapse-playback">
              <button
                type="button"
                className="playback-button"
                onClick={() => {
                  if (frameIndex === frames.length - 1) setFrameIndex(0)
                  setIsPlaying((playing) => !playing)
                }}
                disabled={frames.length < 2}
                aria-label={isPlaying ? 'Pausar timelapse' : 'Reproduzir timelapse'}
              >
                {isPlaying ? 'Pausar' : 'Reproduzir'}
              </button>
              <div className="timeline-range-wrap">
                <input
                  type="range"
                  min={0}
                  max={frames.length - 1}
                  step={1}
                  value={frameIndex}
                  aria-label="Momento da apuração"
                  onChange={(event) => {
                    setIsPlaying(false)
                    setFrameIndex(Number(event.target.value))
                  }}
                />
                <div className="timeline-endpoints">
                  <span>
                    {new Date(frames[0].capturedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>
                    {new Date(frames[frames.length - 1].capturedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <span className="timelapse-moment">{capturedDate}</span>
            </div>

            <div className="timelapse-frame-meta">
              <span>{roundLabel}</span>
              <span>{currentFrame.apuracaoPercent.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% apurado</span>
            </div>

            <div className="race-list" aria-live="polite">
              {activeCandidates.map((candidate) => {
                const featureClass = featuredCandidateClass.get(candidate.name.toLocaleUpperCase('pt-BR'))
                return (
                  <motion.article
                    key={candidate.name}
                    layout={!prefersReducedMotion}
                    className={`race-row ${featureClass ? `race-${featureClass}` : ''}`}
                    transition={{ layout: { duration: prefersReducedMotion ? 0 : 0.5 } }}
                  >
                    <span className="race-position">{candidate.position.toString().padStart(2, '0')}</span>
                    <div className="race-candidate">
                      <div className="race-candidate-heading">
                        <span className="party">{candidate.party}</span>
                        <strong>{candidate.name}</strong>
                      </div>
                      <div className="race-bar" aria-hidden="true">
                        <motion.span
                          initial={prefersReducedMotion ? false : { width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(candidate.percentage, 100))}%` }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <div className="race-metrics">
                      <strong>{formatPercent(candidate.percentage)}</strong>
                      <span>{formatNumber(candidate.votes)} votos</span>
                    </div>
                  </motion.article>
                )
              })}
            </div>
            <p className="timelapse-disclaimer">
              Reprodução baseada em registros oficiais armazenados pelo projeto; não representa uma
              projeção do resultado.
            </p>
          </>
        ) : (
          <div className="timelapse-empty">
            <span className="timelapse-empty-mark" aria-hidden="true">↗</span>
            <div>
              <span className="section-kicker">{roundLabel}</span>
              <h3>
                {round === 'second' && !timeline.secondRoundConfirmed
                  ? 'Segundo turno ainda não confirmado'
                  : 'A corrida começa com a apuração'}
              </h3>
              <p>
                {round === 'second' && !timeline.secondRoundConfirmed
                  ? 'Esta aba será liberada somente quando o TSE confirmar oficialmente a realização do segundo turno.'
                  : round === 'second'
                    ? 'A linha do tempo do segundo turno será exibida após o registro de atualizações oficiais.'
                    : 'As atualizações oficiais ainda não foram armazenadas para reprodução. Quando houver histórico, você poderá acompanhar as mudanças de posição e percentual ao longo da apuração.'}
              </p>
              <span className="timelapse-empty-status">
                {round === 'second' && !timeline.secondRoundConfirmed
                  ? 'Aguardando confirmação oficial'
                  : 'Histórico ainda não disponível'}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function App() {
  const election = getElectionSnapshot()
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
  const [isTimelapsePage, setIsTimelapsePage] = useState(
    () => window.location.hash === '#/timelapse',
  )
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const pageProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.3 })

  useEffect(() => {
    const control = window.setTimeout(() => {
      if (election.dataAvailable) {
        setStatus('ready')
        return
      }

      setStatus('unavailable')
    }, 650)

    return () => window.clearTimeout(control)
  }, [election.dataAvailable])

  useEffect(() => {
    const updatePage = () => {
      const showTimelapse = window.location.hash === '#/timelapse'
      setIsTimelapsePage(showTimelapse)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  const statusText =
    status === 'loading'
      ? 'Carregando resultados'
      : election.dataAvailable
        ? 'Dados oficiais em atualização'
        : 'Resultados ainda não disponíveis'

  const displayedCandidates = [...election.candidates].sort((a, b) => {
    const aOrder = featuredCandidateOrder.get(a.name.toLocaleUpperCase('pt-BR'))
    const bOrder = featuredCandidateOrder.get(b.name.toLocaleUpperCase('pt-BR'))

    if (aOrder !== undefined || bOrder !== undefined) {
      return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER)
    }

    return 0
  })

  const retryLoad = () => {
    setStatus('loading')
    window.setTimeout(() => {
      setStatus(election.dataAvailable ? 'ready' : 'unavailable')
    }, 500)
  }

  return (
    <div className="app-shell">
      <motion.div
        className="reading-progress"
        style={{ scaleX: prefersReducedMotion ? 0 : pageProgress }}
        aria-hidden="true"
      />
      <header className="topbar" aria-label="Cabeçalho do site">
        <div className="brand" aria-label="Marca do projeto">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Logo do site de apuração" className="brand-logo" />
        </div>
        <a className="source-link" href={election.sourceUrl} target="_blank" rel="noreferrer">
          Fonte: {election.sourceLabel}
        </a>
      </header>

      <main className="story" aria-label="Conteúdo principal">
        {isTimelapsePage ? (
          <>
            <nav className="timelapse-page-nav" aria-label="Navegação da linha do tempo">
              <a href="#/">← Voltar aos resultados</a>
            </nav>
            <ElectionTimelapse
              timeline={officialElectionTimelapse}
              prefersReducedMotion={Boolean(prefersReducedMotion)}
            />
          </>
        ) : (
          <>
        <section className="hero" aria-labelledby="hero-title">
          <div className="eyebrow">{election.electionName}</div>
          <div className="hero-grid">
            <motion.div className="hero-copy">
              <p className="kicker">1º TURNO</p>
              <h1 id="hero-title">
                <span>ELEIÇÕES</span>
                <span>2026</span>
              </h1>
              <p className="subtitle">Brasil</p>
            </motion.div>

            <motion.aside
              className="status-panel"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="status-row">
                <span className="status-label">Status da apuração</span>
                <span className={`status-badge ${election.dataAvailable ? 'live' : 'idle'}`}>
                  {status === 'loading'
                    ? 'CARREGANDO'
                    : election.dataAvailable
                      ? 'AO VIVO'
                      : 'AGUARDANDO'}
                </span>
              </div>

              {status === 'loading' ? (
                <div className="ghost-state" aria-live="polite">
                  <div className="pulse-dot" aria-hidden="true" />
                  <strong>CARREGANDO RESULTADOS</strong>
                </div>
              ) : status === 'error' ? (
                <div className="ghost-state error-state" aria-live="assertive">
                  <strong>Não foi possível atualizar os resultados.</strong>
                  <button type="button" onClick={retryLoad} className="retry-button">
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <strong>{statusText}</strong>
              )}

              <div className="stats-grid">
                <div>
                  <span>Seções totalizadas</span>
                  <strong>{formatNumber(election.sectionsTotalized)}</strong>
                </div>
                <div>
                  <span>Apuração</span>
                  <strong>{formatPercent(election.apuracaoPercent)}</strong>
                </div>
                <div>
                  <span>Última atualização</span>
                  <strong>{new Date(election.lastUpdated).toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span>Eleitorado apto</span>
                  <strong>{formatNumber(158745502)}</strong>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>

        <a className="timelapse-entry" href="#/timelapse">
          <span className="timelapse-entry-icon" aria-hidden="true">↗</span>
          <span className="timelapse-entry-copy">
            <span className="section-kicker">Explore a apuração</span>
            <strong>Linha do tempo oficial</strong>
            <span>Acompanhe a corrida eleitoral ao longo do tempo</span>
          </span>
          <span className="timelapse-entry-arrow" aria-hidden="true">→</span>
        </a>

        <section className="leaderboard" aria-labelledby="leaderboard-title">
          <div className="section-head">
            <div>
              <span className="section-kicker">Resultado oficial</span>
              <h2 id="leaderboard-title">Placar do 1º turno</h2>
            </div>
            <div className="summary-pill">
              {election.leader
                ? `${election.leader.name} lidera`
                : election.dataAvailable
                  ? 'Sem classificação disponível'
                  : 'Aguardando apuração'}
            </div>
          </div>

          {status === 'loading' ? (
            <div className="ghost-state leaderboard-ghost" aria-live="polite">
              <div className="pulse-dot" aria-hidden="true" />
              <strong>CARREGANDO RESULTADOS</strong>
            </div>
          ) : (
            <div className="candidate-list" aria-label="Lista de candidatos com votos e percentuais">
              {displayedCandidates.map((candidate, index) => {
                const width = election.dataAvailable ? Math.max(candidate.percentage, 4) : 0
                const candidateName = candidate.name.toLocaleUpperCase('pt-BR')
                const featuredClass = featuredCandidateClass.get(candidateName)

                return (
                  <motion.article
                    key={candidate.name}
                    className={`candidate-row ${featuredClass ?? ''}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={{ duration: 0.45, delay: index * 0.04 }}
                    whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.005 }}
                  >
                    <div className="candidate-header">
                      <div className="candidate-name-wrap">
                        <span className="rank">{election.dataAvailable ? candidate.position : '—'}</span>
                        <div>
                          <div className="candidate-labels">
                            <span className="party">{candidate.party}</span>
                          </div>
                          <h3>{candidate.name}</h3>
                        </div>
                      </div>
                      <div className="candidate-metrics">
                        <span className="vote-count">
                          {election.dataAvailable ? (
                            <AnimatedCounter
                              value={candidate.votes}
                              format={formatNumber}
                              active={election.dataAvailable}
                            />
                          ) : (
                            '—'
                          )}
                        </span>
                        <span className="vote-share">
                          {election.dataAvailable ? (
                            <AnimatedCounter
                              value={candidate.percentage}
                              format={formatPercent}
                              active={election.dataAvailable}
                            />
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="bar-shell" aria-hidden="true">
                      <motion.span
                        className="bar-fill"
                        initial={prefersReducedMotion ? false : { width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.05 }}
                      />
                    </div>
                  </motion.article>
                )
              })}
            </div>
          )}
        </section>

        <section className="meta-grid" aria-label="Resumo da apuração">
          <article className="info-box">
            <span className="info-kicker">Votos</span>
            <strong>{formatNumber(election.totalVotes)}</strong>
            <p>Total de votos registrados na apuração oficial.</p>
          </article>
          <article className="info-box">
            <span className="info-kicker">Válidos</span>
            <strong>{formatNumber(election.validVotes)}</strong>
            <p>Votos válidos até o momento da atualização oficial.</p>
          </article>
          <article className="info-box">
            <span className="info-kicker">Nominais</span>
            <strong>{formatNumber(election.nominalVotes)}</strong>
            <p>Votos nominais computados pelo TSE.</p>
          </article>
        </section>

        <section className="source-panel" aria-labelledby="source-title">
          <div>
            <span className="section-kicker">Transparência da fonte</span>
            <h2 id="source-title">Dados oficiais do TSE</h2>
          </div>

          <div className="source-body">
            <p>
              O projeto utiliza a fonte oficial do Tribunal Superior Eleitoral e mantém a estrutura de
              dados separada da interface para facilitar a atualização posterior sem reescrever o layout.
            </p>
            <p>
              Quando a apuração ainda não está disponível, a aplicação exibe explicitamente esse estado
              em vez de preencher valores fictícios.
            </p>
            <a href={election.sourceUrl} target="_blank" rel="noreferrer">
              Acessar página oficial do TSE
            </a>
          </div>
        </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
